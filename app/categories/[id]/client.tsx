'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { BuyerNav } from '@/components/nav/buyer-nav'
import { SearchBar } from '@/components/categories/SearchBar'
import { Filter, FilterValues } from '@/components/categories/Filter'
import { ProductCards } from '@/components/home/ProductCards'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface Product {
  id: string
  title: string
  brand: string
  model?: string
  images: string[]
  location: string
  price: number
  condition: string
}

interface FilterOptions {
  priceRange: { min: number; max: number }
  colors: string[]
  sizes: string[]
  genders: string[]
  repairCounts: number[]
}

export default function CategoriesBrowseClient({ categoryId }: { categoryId: string }) {
  const searchParams = useSearchParams()
  const categoryName = searchParams.get('name') || 'Category'

  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [filterOptions, setFilterOptions] = useState<FilterOptions | undefined>()
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<FilterValues>({
    minPrice: 0,
    maxPrice: 1000000,
    location: '',
    color: '',
    age: null,
    size: '',
    gender: '',
    repairCount: null,
  })

  // Initial load to get filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const params = new URLSearchParams()
        params.append('category', categoryId)
        params.append('limit', '100')

        const response = await fetch(`/api/products/categories?${params}`)
        const result = await response.json()

        if (result.success && result.filterOptions) {
          setFilterOptions(result.filterOptions)
          // Set initial filter values based on data
          setFilters((prev) => ({
            ...prev,
            minPrice: result.filterOptions.priceRange.min,
            maxPrice: result.filterOptions.priceRange.max,
          }))
        }
      } catch (error) {
        console.error('Error fetching filter options:', error)
      }
    }

    fetchFilterOptions()
  }, [categoryId])

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery)
    await performSearch(searchQuery, filters)
  }

  const handleFilterChange = async (newFilters: FilterValues) => {
    setFilters(newFilters)
    await performSearch(query, newFilters)
  }

  const performSearch = async (searchQuery: string, currentFilters: FilterValues) => {
    setIsLoading(true)
    setHasSearched(true)

    try {
      const params = new URLSearchParams()
      params.append('category', categoryId)
      if (searchQuery) params.append('q', searchQuery)
      if (currentFilters.minPrice > 0) params.append('minPrice', currentFilters.minPrice.toString())
      if (currentFilters.maxPrice < 1000000)
        params.append('maxPrice', currentFilters.maxPrice.toString())
      if (currentFilters.location) params.append('location', currentFilters.location)
      if (currentFilters.color) params.append('color', currentFilters.color)
      if (currentFilters.age) params.append('maxAge', currentFilters.age.toString())
      if (currentFilters.size) params.append('size', currentFilters.size)
      if (currentFilters.gender) params.append('gender', currentFilters.gender)
      if (currentFilters.repairCount !== null)
        params.append('repairCount', currentFilters.repairCount.toString())

      const response = await fetch(`/api/products/categories?${params}`)
      const result = await response.json()

      if (result.success) {
        setProducts(result.data)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <BuyerNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 space-y-2">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
            {categoryName}
          </h1>
          <p className="text-lg text-muted-foreground">
            Browse and search products in this category
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <SearchBar
            categoryId={categoryId}
            categoryName={categoryName}
            onSearch={handleSearch}
            isLoading={isLoading}
          />
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters (Desktop) / Collapsible (Mobile) */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <Filter onFilterChange={handleFilterChange} filterOptions={filterOptions} />
          </aside>

          {/* Products Section */}
          <main className="flex-1 min-w-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Searching products...</p>
                </div>
              </div>
            ) : hasSearched && products.length === 0 ? (
              <Card className="p-8 sm:p-12 text-center">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">No products found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search filters or search terms
                  </p>
                </div>
              </Card>
            ) : !hasSearched ? (
              <Card className="p-8 sm:p-12 text-center">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Start browsing</h3>
                  <p className="text-muted-foreground">
                    Use the search bar and filters above to find products
                  </p>
                </div>
              </Card>
            ) : (
              <ProductCards
                products={products}
                isLoading={isLoading}
                hasSearched={hasSearched}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
