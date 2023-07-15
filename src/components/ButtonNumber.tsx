import { ReactNode } from "react";

type TProps = {
  onClickSub: (value: number) => void,
  onClickAdd: (value: number) => void,
  disabledAdd: boolean,
  disabledSub: boolean,
  value: number,
  max: number,
  min: number,
  context: ReactNode,
}

export default function ButtonNumber(props: TProps) {
  const {
    onClickSub,
    onClickAdd,
    disabledAdd,
    disabledSub,
    value,
    context,
    max,
    min,
  } = props;
  return (
    <div className="flex h-11 w-full rounded-lg border border-gray-400 px-2 dark:border-gray-800 md:flex-1">
      <button
        onClick={() => {
          const _value = Math.max(min, Math.min(value - 1, max))
          onClickSub && onClickSub(_value);
        }}
        className="flex h-full items-center justify-center rounded-l-md px-2 text-center text-2xl disabled:cursor-not-allowed disabled:text-gray-500 dark:text-white dark:disabled:text-gray-600"
        disabled={disabledSub}
      >
        -
      </button>
      <p className="flex h-full w-full items-center justify-center text-center font-mono dark:text-white lg:w-full">
        {context}
      </p>
      <button
        onClick={() => {
          const _value = Math.min(value + 1, max)
          onClickAdd && onClickAdd(_value);
        }}
        className={
          "flex h-full items-center justify-center rounded-r-md px-2 text-center text-2xl disabled:cursor-not-allowed disabled:text-gray-500 dark:text-white dark:disabled:text-gray-600"
        }
        disabled={disabledAdd}
      >
        +
      </button>
    </div>
  )
}
