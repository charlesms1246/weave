import Link from "next/link"

export function Header() {
  return (
    <header className="bg-background border-b sticky top-0 z-50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <span>Weave</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            Create
          </Link>
          <Link href="/rules" className="text-muted-foreground hover:text-foreground transition-colors">
            Rules
          </Link>
        </nav>
      </div>
    </header>
  )
}
