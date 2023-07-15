import {
  ConnectWallet,
  detectContractFeature,
  useActiveClaimConditionForWallet,
  useAddress,
  useClaimConditions,
  useClaimedNFTSupply,
  useClaimerProofs,
  useClaimIneligibilityReasons,
  useContract,
  useContractMetadata,
  useNFT,
  useUnclaimedNFTSupply,
  Web3Button,
} from "@thirdweb-dev/react";
import { BigNumber, utils } from "ethers";
import { useEffect, useMemo, useRef, useState } from "react";
import { HeadingImage } from "./components/HeadingImage";
import { useToast } from "./components/ui/use-toast";
import { parseIneligibility } from "./utils/parseIneligibility";
import {
  contractConst,
  primaryColorConst,
  scanUrl,
  themeConst,
} from "./consts/parameters";
import { ContractWrapper } from "@thirdweb-dev/sdk/dist/declarations/src/evm/core/classes/contract-wrapper";
import { AlarmClock } from "lucide-react";
import Loading from "./components/Loading";
import { Col, Row, Skeleton, Typography } from "@douyinfe/semi-ui";
import ButtonNumber from "./components/ButtonNumber";
import dayjs from "dayjs";
import { omitText } from "./lib/utils";


const urlParams = new URL(window.location.toString()).searchParams;
const contractAddress = urlParams.get("contract") || contractConst || "";
const primaryColor =
  urlParams.get("primaryColor") || primaryColorConst || undefined;

const colors = {
  purple: "#7C3AED",
  blue: "#3B82F6",
  orange: "#F59E0B",
  pink: "#EC4899",
  green: "#10B981",
  red: "#EF4444",
  teal: "#14B8A6",
  cyan: "#22D3EE",
  yellow: "#FBBF24",
} as const;

export default function Home() {
  const contractQuery = useContract(contractAddress);

  const contractMetadata = useContractMetadata(contractQuery.contract);
  const { toast } = useToast();
  const theme = (urlParams.get("theme") || themeConst || "light") as
    | "light"
    | "dark";

  const root = window.document.documentElement;
  root.classList.add(theme);

  const address = useAddress();
  const [quantity, setQuantity] = useState(1);
  const claimConditions = useClaimConditions(contractQuery.contract);
  const [timerNumber, setTimerNumber] = useState(0);

  const activeClaimCondition = useActiveClaimConditionForWallet(
    contractQuery.contract,
    address,
  );

  console.log(activeClaimCondition, 'activeClaimCondition');


  const claimerProofs = useClaimerProofs(contractQuery.contract, address || "");

  const claimIneligibilityReasons = useClaimIneligibilityReasons(
    contractQuery.contract,
    {
      quantity,
      walletAddress: address || "",
    },
  );

  const unclaimedSupply = useUnclaimedNFTSupply(contractQuery.contract);
  const claimedSupply = useClaimedNFTSupply(contractQuery.contract);

  const { data: firstNft, isLoading: firstNftLoading } = useNFT(
    contractQuery.contract,
    0,
  );



  const nextClaimCondition = useMemo(() => {
    if (!claimConditions.data?.length) return;
    for (const item of claimConditions.data as any) {
      const time = (item.startTime as Date).getTime();
      if (time > Date.now()) {
        const diff = dayjs(item.startTime).diff(dayjs());
        const diffDuration = dayjs.duration(diff);
        const formattedDuration = `${diffDuration.days()}D ${diffDuration.hours()}H ${diffDuration.minutes()}M ${diffDuration.seconds()}S`;
        return [item, formattedDuration];
      }
    }
  }, [claimConditions, timerNumber]);


  const numberClaimed = useMemo(() => {
    return BigNumber.from(claimedSupply.data || 0).toString();
  }, [claimedSupply]);


  const numberTotal = useMemo(() => {
    return BigNumber.from(claimedSupply.data || 0)
      .add(BigNumber.from(unclaimedSupply.data || 0))
      .toString();
  }, [claimedSupply.data, unclaimedSupply.data]);

  console.log(BigNumber.from(claimedSupply.data || 0).toString(), BigNumber.from(unclaimedSupply.data || 0).toString(), '123');


  const priceToMint = useMemo(() => {
    const bnPrice = BigNumber.from(
      activeClaimCondition.data?.currencyMetadata.value || 0,
    );
    return `${utils.formatUnits(
      bnPrice.mul(quantity).toString(),
      activeClaimCondition.data?.currencyMetadata.decimals || 18,
    )} ${activeClaimCondition.data?.currencyMetadata.symbol}`;
  }, [
    activeClaimCondition.data?.currencyMetadata.decimals,
    activeClaimCondition.data?.currencyMetadata.symbol,
    activeClaimCondition.data?.currencyMetadata.value,
    quantity,
  ]);

  const maxClaimable = useMemo(() => {
    let bnMaxClaimable;
    try {
      bnMaxClaimable = BigNumber.from(
        activeClaimCondition.data?.maxClaimableSupply || 0,
      );
    } catch (e) {
      bnMaxClaimable = BigNumber.from(1_000_000);
    }

    let perTransactionClaimable;
    try {
      perTransactionClaimable = BigNumber.from(
        activeClaimCondition.data?.maxClaimablePerWallet || 0,
      );
    } catch (e) {
      perTransactionClaimable = BigNumber.from(1_000_000);
    }

    if (perTransactionClaimable.lte(bnMaxClaimable)) {
      bnMaxClaimable = perTransactionClaimable;
    }

    const snapshotClaimable = claimerProofs.data?.maxClaimable;

    if (snapshotClaimable) {
      if (snapshotClaimable === "0") {
        // allowed unlimited for the snapshot
        bnMaxClaimable = BigNumber.from(1_000_000);
      } else {
        try {
          bnMaxClaimable = BigNumber.from(snapshotClaimable);
        } catch (e) {
          // fall back to default case
        }
      }
    }

    const maxAvailable = BigNumber.from(unclaimedSupply.data || 0);

    let max;
    if (maxAvailable.lt(bnMaxClaimable)) {
      max = maxAvailable;
    } else {
      max = bnMaxClaimable;
    }

    if (max.gte(1_000_000)) {
      return 1_000_000;
    }
    return max.toNumber();
  }, [
    claimerProofs.data?.maxClaimable,
    unclaimedSupply.data,
    activeClaimCondition.data?.maxClaimableSupply,
    activeClaimCondition.data?.maxClaimablePerWallet,
  ]);

  const isOpenEdition = useMemo(() => {
    if (contractQuery?.contract) {
      const contractWrapper = (contractQuery.contract as any)
        .contractWrapper as ContractWrapper<any>;

      const featureDetected = detectContractFeature(
        contractWrapper,
        "ERC721SharedMetadata",
      );

      return featureDetected;
    }
    return false;
  }, [contractQuery.contract]);

  const isSoldOut = useMemo(() => {
    try {
      return (
        (activeClaimCondition.isSuccess &&
          BigNumber.from(activeClaimCondition.data?.availableSupply || 0).lte(
            0,
          )) ||
        (numberClaimed === numberTotal && !isOpenEdition)
      );
    } catch (e) {
      return false;
    }
  }, [
    activeClaimCondition.data?.availableSupply,
    activeClaimCondition.isSuccess,
    numberClaimed,
    numberTotal,
    isOpenEdition,
  ]);

  const canClaim = useMemo(() => {
    return (
      activeClaimCondition.isSuccess &&
      claimIneligibilityReasons.isSuccess &&
      claimIneligibilityReasons.data?.length === 0 &&
      !isSoldOut && nextClaimCondition
    );
  }, [
    activeClaimCondition.isSuccess,
    claimIneligibilityReasons.data?.length,
    claimIneligibilityReasons.isSuccess,
    isSoldOut,
    nextClaimCondition,
  ]);

  const isLoading = useMemo(() => {
    return (
      activeClaimCondition.isLoading ||
      unclaimedSupply.isLoading ||
      claimedSupply.isLoading ||
      !contractQuery.contract
    );
  }, [
    activeClaimCondition.isLoading,
    contractQuery.contract,
    claimedSupply.isLoading,
    unclaimedSupply.isLoading,
  ]);

  const buttonLoading = useMemo(
    () => isLoading || claimIneligibilityReasons.isLoading,
    [claimIneligibilityReasons.isLoading, isLoading],
  );

  const buttonText = useMemo(() => {
    if (isSoldOut) {
      return "Sold Out";
    }

    if (canClaim) {
      const pricePerToken = BigNumber.from(
        activeClaimCondition.data?.currencyMetadata.value || 0,
      );
      if (pricePerToken.eq(0)) {
        return "Mint (Free)";
      }
      return `Mint`;
    }
    if (claimIneligibilityReasons.data?.length) {
      return parseIneligibility(claimIneligibilityReasons.data, quantity);
    }
    if (buttonLoading) {
      return "Checking eligibility...";
    }

    return "Minting not available";
  }, [
    isSoldOut,
    canClaim,
    claimIneligibilityReasons.data,
    buttonLoading,
    activeClaimCondition.data?.currencyMetadata.value,
    priceToMint,
    quantity,
  ]);

  const dropNotReady = useMemo(
    () =>
      claimConditions.data?.length === 0 ||
      claimConditions.data?.every((cc) => cc.maxClaimableSupply === "0"),
    [claimConditions.data],
  );

  const dropStartingSoon = useMemo(
    () =>
      (claimConditions.data &&
        claimConditions.data.length > 0 &&
        activeClaimCondition.isError) ||
      (activeClaimCondition.data &&
        activeClaimCondition.data.startTime > new Date()),
    [
      activeClaimCondition.data,
      activeClaimCondition.isError,
      claimConditions.data,
    ],
  );

  if (!contractAddress) {
    return (
      <div className="flex h-full items-center justify-center">
        No contract address provided
      </div>
    );
  }

  useEffect(() => {
    let _timer = setTimeout(() => {
      setTimerNumber((value) => {
        return ++value;
      })
    }, 1000);
    return () => {
      clearTimeout(_timer);
    }
  }, [timerNumber])

  return (
    <div className="relative h-full w-screen">

      <div className="container h-full relative z-10 max-md:pt-20">
        <Row
          type="flex"
          className="h-full"
          gutter={[12, 12]}
          align="middle"
        >
          <Col lg={12} span={24}>
            <div className="max-w-[400px] mx-auto">
              <HeadingImage
                src={contractMetadata.data?.image || firstNft?.metadata.image}
                isLoading={isLoading}
              />
            </div>
          </Col>

          <Col lg={12} span={24}>
            <div className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-xl md:p-12 p-6 border border-gray-800">
              <div className="flex flex-col gap-2 xs:gap-4">
                <Skeleton
                  placeholder={<Skeleton.Title />}
                  loading={isLoading || isOpenEdition}
                >
                  <p>
                    <span className="text-lg font-bold tracking-wider text-gray-500 xs:text-xl lg:text-2xl">
                      {numberClaimed}
                    </span>&nbsp;
                    <span className="text-lg font-bold tracking-wider xs:text-xl lg:text-2xl">
                      / {activeClaimCondition?.data?.maxClaimableSupply || 0} MINTED
                    </span>
                    {
                      <span className="md:ml-10 ml-3">
                        <AlarmClock className="inline-block -mt-2" />
                        <span className="ml-2 max-md:text-sm">{nextClaimCondition?.[1] ?? '0D 0H 0M 0S'}</span>
                      </span>
                    }

                  </p>
                </Skeleton>
                <h1 className="line-clamp-1 text-2xl font-bold xs:text-3xl lg:text-4xl">
                  <Skeleton
                    placeholder={<Skeleton.Title />}
                    loading={contractMetadata.isLoading || !contractMetadata.data?.name}
                  >
                    {contractMetadata.data?.name}
                  </Skeleton>
                </h1>
                <div className="line-clamp-2 text-gray-500">
                  <Skeleton
                    placeholder={<Skeleton.Paragraph rows={2} />}
                    loading={contractMetadata.isLoading || !contractMetadata.data?.description}
                  >
                    {contractMetadata.data?.description}
                  </Skeleton>
                </div>
              </div>
              <div className="flex w-full gap-4">
                {dropNotReady ? (
                  <span className="text-red-500">
                    This drop is not ready to be minted yet. (No claim condition
                    set)
                  </span>
                ) : dropStartingSoon ? (
                  <span className="text-gray-500">
                    Drop is starting soon. Please check back later.
                  </span>
                ) : (
                  <div className="flex w-full flex-col gap-4">
                    <div>

                      <Skeleton
                        placeholder={<Skeleton.Title />}
                        loading={contractMetadata.isLoading || !activeClaimCondition.data}
                      >
                        <div className="flex items-center flex-1">
                          <ButtonNumber
                            value={quantity}
                            max={maxClaimable}
                            min={1}
                            context={!isLoading && isSoldOut ? "Sold Out" : quantity}
                            onClickSub={(value) => {
                              setQuantity(value);
                            }}
                            onClickAdd={(value) => {
                              setQuantity(value);
                            }}
                            disabledSub={isSoldOut || quantity <= 1}
                            disabledAdd={isSoldOut || quantity >= maxClaimable}
                          />

                          <div className="md:ml-4 ml-2 flex-shrink-0">
                            <p className="md:text-2xl text-lg font-bold">{priceToMint}</p>
                          </div>

                        </div>
                      </Skeleton>

                      <Web3Button
                        contractAddress={
                          contractQuery.contract?.getAddress() || ""
                        }
                        style={{
                          backgroundColor:
                            colors[primaryColor as keyof typeof colors] ||
                            primaryColor,
                          maxHeight: "43px",
                          marginTop: '24px',
                          width: '100%',
                          color: 'white'
                        }}
                        theme={theme}
                        action={(cntr) => cntr.erc721.claim(quantity)}
                        isDisabled={!canClaim || buttonLoading}
                        onError={(err) => {
                          console.error(err);
                          console.log({ err });
                          toast({
                            title: "Failed to mint drop",
                            description: (err as any).reason || "",
                            duration: 9000,
                            variant: "destructive",
                          });
                        }}
                        onSuccess={() => {
                          toast({
                            title: "Successfully minted",
                            description:
                              "The NFT has been transferred to your wallet",
                            duration: 5000,
                            className: "bg-green-500",
                          });
                        }}
                      >
                        <Loading loading={buttonLoading} >
                          {buttonText}
                        </Loading>
                      </Web3Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-between max-md:flex-wrap">
                <div>
                  <Typography.Title heading={6}>Contract Address</Typography.Title>
                  <Typography.Text link={{
                    href: `${scanUrl}/address/${contractAddress}`,
                    target: '_blank'
                  }}>{omitText(contractAddress!)}</Typography.Text>
                </div>

                <div>
                  <Typography.Title heading={6}>Token standard</Typography.Title>
                  <Typography.Text >ERC-721</Typography.Text>
                </div>

                <div>
                  <Typography.Title heading={6}>BlockChain</Typography.Title>
                  <Typography.Text>Polygon</Typography.Text>
                </div>
              </div>
            </div>




          </Col>
        </Row>
      </div>

      <div className="z-20 !absolute !right-4 !top-4">
        <ConnectWallet theme='dark' />
      </div>

    </div>
  );
}
