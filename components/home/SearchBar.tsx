'use client'

import React, { useEffect, useRef } from "react"

import { useState } from 'react'
import { Search, ChevronDown, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useNigerianStates } from '@/hooks/useNigerianStates'

interface ProductSuggestion {
  id: string
  title: string
  brand: string
  price: number
  image?: string
}

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void
  isLoading?: boolean
}

export interface SearchFilters {
  query: string
  minPrice: number
  maxPrice: number
  location: string
  maxAge: number | null
}

export function SearchBar({ onSearch, isLoading = false }: SearchBarProps) {
  const { states } = useNigerianStates()
  const [showFilters, setShowFilters] = useState(false)
  const [query, setQuery] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [location, setLocation] = useState('')
  const [maxAge, setMaxAge] = useState('')
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const hasActiveFilters =
    minPrice || maxPrice || location || maxAge

  // Fetch suggestions after 3 characters
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 3) {
        setLoadingSuggestions(true)
        try {
          const params = new URLSearchParams()
          params.append('q', query)
          params.append('limit', '5')

          const response = await fetch(`/api/products?${params}`)
          const result = await response.json()

          if (result.success) {
            const mappedSuggestions: ProductSuggestion[] = (result.data || []).map((product: any) => ({
              id: product.id,
              title: product.title,
              brand: product.brand,
              price: product.price,
              image: product.images?.[0],
            }))
            setSuggestions(mappedSuggestions)
            setShowSuggestions(true)
          }
        } catch (error) {
          console.error('Error fetching suggestions:', error)
        } finally {
          setLoadingSuggestions(false)
        }
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 300) // Debounce 300ms

    return () => clearTimeout(timer)
  }, [query])

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = () => {
    onSearch({
      query,
      minPrice: minPrice ? parseInt(minPrice) : 0,
      maxPrice: maxPrice ? parseInt(maxPrice) : Infinity,
      location,
      maxAge: maxAge ? parseInt(maxAge) : null,
    })
    setShowSuggestions(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleClearFilters = () => {
    setMinPrice('')
    setMaxPrice('')
    setLocation('')
    setMaxAge('')
  }

  const handleSuggestionClick = (suggestion: ProductSuggestion) => {
    setQuery(suggestion.title)
    setShowSuggestions(false)
    // Navigate to product detail
    window.location.href = `/product/${suggestion.id}`
  }

  const handleClear = () => {
    setQuery('')
    setSuggestions([])
    setShowSuggestions(false)
  }

  return (
    <div className="w-full space-y-4">
      <Card className="p-4 sm:p-6">
        <div className="space-y-4">
          {/* Search Input with Suggestions */}
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search products by brand, model, or keywords..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => query.length >= 3 && setShowSuggestions(true)}
              className="pl-10 pr-10"
              disabled={isLoading}
            />
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            {query && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Suggestions Dropdown */}
            {showSuggestions && (
              <Card
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 mt-2 z-50 border-2 border-primary/20 shadow-lg"
              >
                {loadingSuggestions ? (
                  <div className="p-4 flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Finding matches...</span>
                  </div>
                ) : suggestions.length > 0 ? (
                  <ul className="max-h-64 overflow-y-auto">
                    {suggestions.map((suggestion) => (
                      <li key={suggestion.id}>
                        <button
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors flex items-center gap-3 border-b border-border last:border-b-0"
                        >
                          {/* Product Image */}
                          {suggestion.image && (
                            <div className="w-10 h-10 rounded bg-muted overflow-hidden flex-shrink-0">
                              <img
                                src={suggestion.image}
                                alt={suggestion.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground text-sm truncate">
                              {suggestion.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {suggestion.brand}
                            </div>
                          </div>

                          {/* Price */}
                          <div className="text-sm font-semibold text-primary flex-shrink-0">
                            ₦{suggestion.price.toLocaleString()}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No products found matching "{query}"
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Filter Toggle and Search Button */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 w-full sm:w-auto bg-transparent"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              Filters
              {hasActiveFilters && (
                <span className="ml-auto sm:ml-2 px-2 py-1 text-xs bg-primary text-primary-foreground rounded-full">
                  {[minPrice, maxPrice, location, maxAge].filter(Boolean).length}
                </span>
              )}
            </Button>
            <Button
              onClick={handleSearch}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="pt-4 border-t border-border space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Min Price */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Min Price (NGN)</label>
                  <Input
                    type="number"
                    placeholder="e.g., 10000"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                {/* Max Price */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Price (NGN)</label>
                  <Input
                    type="number"
                    placeholder="e.g., 500000"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <div className="relative">
                    <select
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={isLoading}
                    >
                      <option value="">All states</option>
                      {states.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Product Age */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Age (Years)</label>
                  <Input
                    type="number"
                    placeholder="e.g., 2"
                    value={maxAge}
                    onChange={(e) => setMaxAge(e.target.value)}
                    min="0"
                    step="0.5"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={handleClearFilters}
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
