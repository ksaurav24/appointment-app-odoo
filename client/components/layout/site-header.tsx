import Image from "next/image";
import Link from "next/link";
import { APP_NAME, ROUTES } from "@/constants";

export function SiteHeader() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <Link
          href={ROUTES.home}
          className="flex items-center gap-3 text-sm font-medium text-gray-900"
        >
          <Image src="/globe.svg" alt="App logo" width={20} height={20} priority />
          {APP_NAME}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href={ROUTES.login}
            className="text-gray-700 transition-all duration-150 hover:text-blue-600"
          >
            Login
          </Link>
          <Link
            href={ROUTES.signup}
            className="text-gray-700 transition-all duration-150 hover:text-blue-600"
          >
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}
