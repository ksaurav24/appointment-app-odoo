"use client"

import { useMemo, useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  Search01Icon,
  Sorting01Icon,
  FilterIcon,
  StethoscopeIcon,
  Dumbbell01Icon,
  FootballIcon,
  FlowerIcon,
  BookOpen01Icon,
  Clock01Icon,
  GlobalIcon,
  FireIcon,
  Cancel01Icon,
  Add01Icon,
} from "@hugeicons/core-free-icons"

import { PublicShell } from "@/components/layout/public-shell"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { usePublicAppointmentTypes } from "@/hooks/usePublicAppointments"
import { formatDuration, formatDurationRange, formatPrice } from "@/lib/format"
import type { PublicAppointmentTypeListItem } from "@/types"

const CATEGORY_MAP = [
  { label: "All", icon: null },
  { label: "Health & Medical", icon: StethoscopeIcon },
  { label: "Fitness & Gym", icon: Dumbbell01Icon },
  { label: "Sports & Turf", icon: FootballIcon },
  { label: "Beauty & Wellness", icon: FlowerIcon },
  { label: "Education", icon: BookOpen01Icon },
]

function getCategoryTheme(category?: string | null) {
  const normalize = (c?: string | null) => (c || "Education").toLowerCase()
  const c = normalize(category)
  if (c.includes("health") || c.includes("medical"))
    return { bg: "bg-coral", text: "text-coral" }
  if (c.includes("fitness") || c.includes("gym"))
    return { bg: "bg-forest-deep", text: "text-forest-deep" }
  if (c.includes("sport") || c.includes("turf"))
    return { bg: "bg-amber", text: "text-amber" }
  if (c.includes("beauty") || c.includes("wellness"))
    return { bg: "bg-forest-light", text: "text-forest-light" }
  return { bg: "bg-forest-mid", text: "text-forest-mid" } // Default/Education
}

function getCategoryIcon(category?: string | null) {
  const normalize = (c?: string | null) => (c || "Education").toLowerCase()
  const c = normalize(category)
  if (c.includes("health") || c.includes("medical")) return StethoscopeIcon
  if (c.includes("fitness") || c.includes("gym")) return Dumbbell01Icon
  if (c.includes("sport") || c.includes("turf")) return FootballIcon
  if (c.includes("beauty") || c.includes("wellness")) return FlowerIcon
  return BookOpen01Icon // Default/Education
}

function durationLabel(type: PublicAppointmentTypeListItem): string {
  if (type.durationMode === "FIXED" && type.durationMinutes != null) {
    return formatDuration(type.durationMinutes)
  }
  if (
    type.durationMode === "VARIABLE" &&
    type.minDurationMins != null &&
    type.maxDurationMins != null
  ) {
    return formatDurationRange(type.minDurationMins, type.maxDurationMins)
  }
  return "Variable"
}

function getInitials(name?: string) {
  if (!name) return "??"
  return name.substring(0, 2).toUpperCase()
}

function BrowseContent() {
  const { data, isPending } = usePublicAppointmentTypes()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [query, setQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")
  const [sort, setSort] = useState<
    "relevance" | "newest" | "price-asc" | "duration"
  >("relevance")

  useEffect(() => {
    const q = searchParams.get("q")
    if (q) setQuery(q)
  }, [searchParams])

  const sortLabel = {
    relevance: "Relevance",
    newest: "Newest",
    "price-asc": "Price: Low–High",
    duration: "Duration",
  }[sort]

  const filtered = useMemo(() => {
    if (!data) return []
    let items = [...data]

    // Filter Category
    if (activeCategory !== "All") {
      items = items.filter(
        (t) => (t.category || "Education") === activeCategory
      )
    }

    // Filter Search
    const q = query.trim().toLowerCase()
    if (q) {
      items = items.filter((t) => {
        const haystack =
          `${t.name} ${t.description ?? ""} ${t.slug} ${t.category ?? ""} ${t.organization?.name ?? ""}`.toLowerCase()
        return haystack.includes(q)
      })
    }

    // Sort
    if (sort === "price-asc") {
      items.sort(
        (a, b) => (a.advancePaymentAmount || 0) - (b.advancePaymentAmount || 0)
      )
    } else if (sort === "duration") {
      items.sort((a, b) => (a.durationMinutes || 0) - (b.durationMinutes || 0))
    } else if (sort === "newest") {
      items.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    }

    return items
  }, [data, query, activeCategory, sort])

  const hasActiveFilters = activeCategory !== "All" || sort !== "relevance"

  return (
    <PublicShell showBrowseLink={true}>
      {/* PAGE HEADER */}
      <div className="border-b border-cream-2 bg-white px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row">
            <div>
              <div className="mb-2 text-xs font-semibold tracking-widest text-forest-light uppercase">
                Discover & Book
              </div>
              <h1 className="font-heading text-4xl tracking-tight text-slate-dark">
                Browse Services
              </h1>
              <p className="mt-1 max-w-xl text-base text-slate-mid">
                Find a service, pick a time, and you're booked — in under 60
                seconds.
              </p>
            </div>
            <div className="rounded-full bg-forest-pale px-4 py-2 text-sm font-semibold whitespace-nowrap text-forest-deep">
              {filtered.length} services available
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative max-w-xl flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <HugeiconsIcon
                  icon={Search01Icon}
                  className="h-4 w-4 text-slate-light"
                />
              </div>
              <input
                placeholder="Search by name, category, or provider..."
                className="h-11 w-full rounded-xl border border-cream-2 bg-slate-pale/50 pr-4 pl-10 font-body text-sm transition-all focus:border-forest-light focus:ring-2 focus:ring-forest-light/30 focus:outline-none"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    className="h-11 min-w-[140px] justify-center gap-2 rounded-xl border-cream-2 text-sm whitespace-nowrap text-slate-mid"
                  />
                }
              >
                <HugeiconsIcon icon={Sorting01Icon} className="h-4 w-4" />
                Sort: {sortLabel}
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 border-cream-2/60 bg-white shadow-lg"
              >
                <div className="px-3 py-2.5 text-xs font-medium tracking-wider text-slate-light uppercase">
                  Sort by
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={sort}
                  onValueChange={(v: any) => setSort(v)}
                >
                  <DropdownMenuRadioItem value="relevance">
                    Relevance
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="newest">
                    Newest
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="price-asc">
                    Price: Low–High
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="duration">
                    Duration
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    className="h-11 gap-2 rounded-xl border-cream-2 text-sm text-slate-mid"
                  />
                }
              >
                <HugeiconsIcon icon={FilterIcon} className="h-4 w-4" />
                Filters
                {activeCategory !== "All" && (
                  <span className="-ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber text-xs text-white">
                    1
                  </span>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 border-cream-2/60 bg-white shadow-lg"
              >
                <div className="px-3 py-2.5 text-xs font-medium tracking-wider text-slate-light uppercase">
                  Filter Category
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={activeCategory}
                  onValueChange={setActiveCategory}
                >
                  {CATEGORY_MAP.map((cat) => (
                    <DropdownMenuRadioItem
                      key={cat.label}
                      value={cat.label}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {cat.icon && (
                          <HugeiconsIcon
                            icon={cat.icon}
                            className="h-4 w-4 text-slate-mid"
                          />
                        )}
                        {cat.label}
                      </div>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* ACTIVE FILTER STATE FEEDBACK */}
          {hasActiveFilters && (
            <div className="mt-4 flex animate-in flex-wrap items-center gap-2 duration-200 fade-in-0">
              <span className="mr-1 text-sm text-slate-mid">
                Showing results for:
              </span>
              {activeCategory !== "All" && (
                <div className="flex items-center gap-1.5 rounded-full bg-forest-pale px-3 py-1.5 text-xs font-semibold text-forest-deep">
                  {activeCategory}
                  <button
                    onClick={() => setActiveCategory("All")}
                    className="flex h-4 w-4 items-center justify-center rounded-full transition-colors hover:bg-forest-deep hover:text-white"
                  >
                    <HugeiconsIcon
                      icon={Cancel01Icon}
                      className="h-2.5 w-2.5"
                    />
                  </button>
                </div>
              )}
              {sort !== "relevance" && (
                <div className="flex items-center gap-1.5 rounded-full bg-forest-pale px-3 py-1.5 text-xs font-semibold text-forest-deep">
                  Sorted by: {sortLabel}
                  <button
                    onClick={() => setSort("relevance")}
                    className="flex h-4 w-4 items-center justify-center rounded-full transition-colors hover:bg-forest-deep hover:text-white"
                  >
                    <HugeiconsIcon
                      icon={Cancel01Icon}
                      className="h-2.5 w-2.5"
                    />
                  </button>
                </div>
              )}
              <button
                onClick={() => {
                  setActiveCategory("All")
                  setSort("relevance")
                  setQuery("")
                }}
                className="ml-auto text-xs font-semibold text-coral hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid Content */}
      <div className="mx-auto max-w-6xl px-6 py-10">
        {isPending ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-cream-2 bg-white p-5"
              >
                <div className="-mx-5 -mt-5 mb-5 h-1.5 w-[calc(100%+40px)] rounded-full bg-cream-2" />
                <div className="mb-4 flex justify-between">
                  <div className="h-3 w-32 rounded-full bg-slate-pale" />
                  <div className="h-10 w-10 rounded-xl bg-slate-pale" />
                </div>
                <div className="mb-2 h-6 w-3/4 rounded-full bg-slate-pale" />
                <div className="mb-1 h-4 w-full rounded-full bg-slate-pale" />
                <div className="mb-5 h-4 w-2/3 rounded-full bg-slate-pale" />
                <div className="mt-auto flex gap-2">
                  <div className="h-6 w-20 rounded-full bg-amber-pale" />
                  <div className="h-6 w-24 rounded-full bg-slate-pale" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-forest-light/10 bg-forest-pale shadow-sm">
              <HugeiconsIcon
                icon={Search01Icon}
                className="h-8 w-8 text-forest-light"
              />
            </div>
            <h3 className="font-heading text-2xl text-slate-dark">
              No services found
            </h3>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-mid">
              Try a different search term or browse a different category.
            </p>
            <Button
              variant="outline"
              className="mt-6 rounded-full border-forest-deep text-forest-deep hover:bg-forest-pale"
              onClick={() => {
                setQuery("")
                setActiveCategory("All")
                router.replace("/browse")
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((type, index) => {
              const theme = getCategoryTheme(type.category)
              const Icon = getCategoryIcon(type.category)
              const isFree = !type.advancePaymentEnabled
              const hasCapacity = type.entities && type.entities.length > 0

              return (
                <Link
                  key={type.id}
                  href={`/services/${type.id}`}
                  className="group flex animate-in cursor-pointer flex-col overflow-hidden rounded-2xl border border-cream-2 bg-white transition-all duration-300 fade-in-0 fill-mode-both slide-in-from-bottom-4 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-dark/5"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <div className={`h-1.5 w-full ${theme.bg}`} />
                  <div className="flex flex-1 flex-col p-5">
                    {/* Row 1 — org + icon */}
                    <div className="mb-4 flex items-start justify-between gap-2">
                      <div className="max-w-[200px] truncate text-xs font-semibold tracking-wide text-slate-light uppercase">
                        {type.organization?.name || "BookEase Service"}
                      </div>
                      <div
                        className={`h-10 w-10 ${theme.bg.replace("bg-", "bg-").replace("-deep", "-pale").replace("-mid", "-pale").replace("-light", "-pale").concat("/20")} flex flex-shrink-0 items-center justify-center rounded-xl border border-cream-2/50 shadow-sm`}
                      >
                        <HugeiconsIcon
                          icon={Icon}
                          className={`h-5 w-5 ${theme.text}`}
                        />
                      </div>
                    </div>

                    {/* Row 2 — service name */}
                    <h3 className="mb-1 font-heading text-xl leading-tight text-slate-dark transition-colors group-hover:text-forest-deep">
                      {type.name}
                    </h3>

                    {/* Row 3 — description */}
                    <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-mid">
                      {type.description ||
                        "No description provided for this service."}
                    </p>

                    {/* Row 4 — metadata pills */}
                    <div className="mb-auto flex flex-wrap gap-2 pb-4">
                      <div className="flex items-center gap-1 rounded-full border border-amber/10 bg-amber-pale px-3 py-1.5 text-xs font-semibold text-amber-deep">
                        <HugeiconsIcon icon={Clock01Icon} className="h-3 w-3" />
                        {durationLabel(type)}
                      </div>

                      {!isFree ? (
                        <div className="flex items-center gap-1 rounded-full border border-forest-light/20 bg-forest-pale px-3 py-1.5 text-xs font-semibold text-forest-deep">
                          <span>₹</span>
                          {formatPrice(type.advancePaymentAmount).replace(
                            "₹",
                            ""
                          )}{" "}
                          adv.
                        </div>
                      ) : (
                        <div className="rounded-full border border-slate-light/20 bg-slate-pale px-3 py-1.5 text-xs font-semibold text-slate-mid">
                          Free to book
                        </div>
                      )}

                      {hasCapacity && (
                        <div className="flex items-center gap-1 rounded-full border border-coral/10 bg-coral-pale px-3 py-1.5 text-xs font-semibold text-coral">
                          <HugeiconsIcon icon={FireIcon} className="h-3 w-3" />
                          {type.entities.length} slots left
                        </div>
                      )}
                    </div>

                    {/* Row 5 — divider + CTA */}
                    <div className="mt-auto flex items-center justify-between border-t border-cream-2 pt-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-forest-light/20 bg-forest-pale text-xs font-bold tracking-wider text-forest-deep">
                          {getInitials(type.organization?.name)}
                        </div>
                        <span className="max-w-[120px] truncate text-xs font-medium text-slate-light">
                          {type.organization?.name || "Independent"}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="h-8 translate-x-2 rounded-full border-0 bg-forest-deep px-4 text-xs font-semibold text-white opacity-0 shadow-sm transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 hover:bg-forest-mid"
                        render={<span />}
                      >
                        Book Now →
                      </Button>
                    </div>
                  </div>
                </Link>
              )
            })}

            {/* Empty grid slot item - Render if we have results but grid isn't full (3 cols, so multiple of 3) */}
            {filtered.length > 0 && filtered.length % 3 !== 0 && (
              <div
                className="group flex min-h-[220px] animate-in cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-cream-2 p-5 text-center transition-all fade-in-0 fill-mode-both slide-in-from-bottom-4 hover:border-forest-light hover:bg-forest-pale/30"
                style={{ animationDelay: `${filtered.length * 80}ms` }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-forest-pale text-forest-light shadow-sm transition-all group-hover:bg-forest-deep group-hover:text-white">
                  <HugeiconsIcon icon={Add01Icon} className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-sm font-semibold text-slate-dark">
                  Don't see your service?
                </h4>
                <p className="mt-1 max-w-[200px] text-xs text-slate-light">
                  Browse all categories or suggest a new one.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </PublicShell>
  )
}

export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <PublicShell showBrowseLink={true}>
          <div className="border-b border-cream-2 bg-white px-6 py-10">
            <div className="mx-auto max-w-6xl">
              <Skeleton className="mb-2 h-4 w-32 bg-cream-2" />
              <Skeleton className="mb-3 h-10 w-64 bg-cream-2" />
              <Skeleton className="h-5 w-80 max-w-full bg-cream-2" />
            </div>
          </div>
          <div className="mx-auto max-w-6xl px-6 py-10">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  className="h-[280px] rounded-2xl bg-cream-2/50"
                />
              ))}
            </div>
          </div>
        </PublicShell>
      }
    >
      <BrowseContent />
    </Suspense>
  )
}
