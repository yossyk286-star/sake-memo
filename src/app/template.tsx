/** 画面が移るたびに作り直される枠。ふわっと出して、パッと切り替わらないようにする */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
