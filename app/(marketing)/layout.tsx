import { MegaMenu } from "@/components/marketing/mega-menu"
import { MarketingFooter } from "@/components/marketing/footer"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <MegaMenu />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  )
}
