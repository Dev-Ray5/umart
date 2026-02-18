'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

interface Suggestion {
  id: string
  title: string
  brand: string
  price: number
  image?: string
}

interface SearchBarProps {
  categoryId: string
  categoryName: string
  onSearch: (query: string) => void
  isLoading?: boolean
}

export function SearchBar({
  categoryId,
  categoryName,
  onSearch,
  isLoading = false,
}: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch suggestions after 3 characters
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 3) {
        setLoadingSuggestions(true)
        try {
          const params = new URLSearchParams()
          params.append('category', categoryId)
          params.append('q', query)
          params.append('limit', '5')

          const response = await fetch(`/api/products/categories?${params}`)
          const result = await response.json()

          if (result.success) {
            const mappedSuggestions: Suggestion[] = (result.data || []).map((product: any) => ({
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
  }, [query, categoryId])

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
    onSearch(query)
    setShowSuggestions(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setQuery(suggestion.title)
    setShowSuggestions(false)
    // Trigger navigation to product detail
    window.location.href = `/product/${suggestion.id}`
  }

  const handleClear = () => {
    setQuery('')
    setSuggestions([])
    setShowSuggestions(false)
  }

  return (
    <div className="w-full space-y-4">
      <div className="relative">
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            placeholder={`Search in ${categoryName}...`}
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
        </div>

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
                {suggestions.map((suggestion, index) => (
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

      {/* Search Button */}
      <Button
        onClick={handleSearch}
        disabled={isLoading || query.length === 0}
        className="w-full"
      >
        {isLoading ? 'Searching...' : 'Search'}
      </Button>
    </div>
  )
}
