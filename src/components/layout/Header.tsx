import { Github, Twitter } from "lucide-react"

export default function Header() {

  return (
    <header>
      <div className='container'>
        <div className='flex '>
          <div className='flex-1 flex'>
            <Twitter />
            <Github />
          </div>
          <div className='flex-1'>
            {/* TODO: logo  */}
          </div>
          <div className='flex-1 flex'>
            {/* TODO:  */}
            <a href=""></a>
          </div>
        </div>
      </div>
    </header>
  )
}
