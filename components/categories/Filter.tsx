'use client'

import React, { useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useNigerianStates } from '@/hooks/useNigerianStates'

export interface FilterValues {
  minPrice: number
  maxPrice: number
  location: string
  color: string
  age: number | null
  size: string
  gender: string
  repairCount: number | null
}

interface FilterProps {
  onFilterChange: (filters: FilterValues) => void
  filterOptions?: {
    priceRange: { min: number; max: number }
    colors: string[]
    sizes: string[]
    genders: string[]
    repairCounts: number[]
  }
}

export function Filter({ onFilterChange, filterOptions }: FilterProps) {
  const { states } = useNigerianStates()
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [expandedFilters, setExpandedFilters] = useState<Set<string>>(new Set(['price']))
  const [filters, setFilters] = useState<FilterValues>({
    minPrice: filterOptions?.priceRange.min || 0,
    maxPrice: filterOptions?.priceRange.max || 1000000,
    location: '',
    color: '',
    age: null,
    size: '',
    gender: '',
    repairCount: null,
  })

  const hasActiveFilters =
    filters.minPrice > (filterOptions?.priceRange.min || 0) ||
    filters.maxPrice < (filterOptions?.priceRange.max || 1000000) ||
    filters.location ||
    filters.color ||
    filters.age ||
    filters.size ||
    filters.gender ||
    filters.repairCount !== null

  const toggleFilter = (filterName: string) => {
    const newExpanded = new Set(expandedFilters)
    if (newExpanded.has(filterName)) {
      newExpanded.delete(filterName)
    } else {
      newExpanded.add(filterName)
    }
    setExpandedFilters(newExpanded)
  }

  const handleFilterChange = (key: keyof FilterValues, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleClearFilters = () => {
    const defaultFilters: FilterValues = {
      minPrice: filterOptions?.priceRange.min || 0,
      maxPrice: filterOptions?.priceRange.max || 1000000,
      location: '',
      color: '',
      age: null,
      size: '',
      gender: '',
      repairCount: null,
    }
    setFilters(defaultFilters)
    onFilterChange(defaultFilters)
  }

  const filterSections = [
    {
      id: 'price',
      label: 'Price Range',
      type: 'range' as const,
    },
    {
      id: 'location',
      label: 'Location',
      type: 'select' as const,
      options: states,
    },
    {
      id: 'color',
      label: 'Color',
      type: 'select' as const,
      options: filterOptions?.colors || [],
    },
    {
      id: 'age',
      label: 'Product Age (Years)',
      type: 'number' as const,
    },
    {
      id: 'size',
      label: 'Size',
      type: 'select' as const,
      options: filterOptions?.sizes || [],
    },
    {
      id: 'gender',
      label: 'Gender',
      type: 'select' as const,
      options: filterOptions?.genders || [],
    },
    {
      id: 'repairCount',
      label: 'Repair Count',
      type: 'select' as const,
      options: (filterOptions?.repairCounts || []).map((count) => String(count)),
    },
  ]

  const renderFilterContent = () => (
    <div className="space-y-4">
      {filterSections.map((section) => (
        <div key={section.id} className="border-b border-border pb-4 last:border-b-0">
          {/* Filter Header */}
          <button
            onClick={() => toggleFilter(section.id)}
            className="w-full flex items-center justify-between py-2 hover:text-primary transition-colors"
          >
            <span className="font-medium text-foreground">{section.label}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                expandedFilters.has(section.id) ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Filter Content */}
          {expandedFilters.has(section.id) && (
            <div className="mt-3 space-y-3">
              {section.type === 'range' && (
                <div className="space-y-3">
                  {/* Min Price */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Min Price</label>
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.minPrice}
                      onChange={(e) =>
                        handleFilterChange('minPrice', parseInt(e.target.value) || 0)
                      }
                      className="text-sm"
                    />
                  </div>

                  {/* Max Price */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Max Price</label>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.maxPrice}
                      onChange={(e) =>
                        handleFilterChange('maxPrice', parseInt(e.target.value) || 1000000)
                      }
                      className="text-sm"
                    />
                  </div>
                </div>
              )}

              {section.type === 'number' && (
                <Input
                  type="number"
                  placeholder={`Enter ${section.label.toLowerCase()}`}
                  value={filters.age || ''}
                  onChange={(e) =>
                    handleFilterChange('age', e.target.value ? parseInt(e.target.value) : null)
                  }
                  min="0"
                  step="0.5"
                  className="text-sm"
                />
              )}

              {section.type === 'select' && (
                <select
                  value={
                    section.id === 'repairCount'
                      ? filters.repairCount || ''
                      : (filters[section.id as keyof FilterValues] as string) || ''
                  }
                  onChange={(e) => {
                    if (section.id === 'repairCount') {
                      handleFilterChange('repairCount', e.target.value ? parseInt(e.target.value) : null)
                    } else {
                      handleFilterChange(section.id as keyof FilterValues, e.target.value)
                    }
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                >
                  <option value="">Select {section.label.toLowerCase()}</option>
                  {section.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          onClick={handleClearFilters}
          className="w-full text-destructive hover:text-destructive mt-4"
        >
          <X className="w-4 h-4 mr-2" />
          Clear All Filters
        </Button>
      )}
    </div>
  )

  return (
    <>
      {/* Mobile Filter Button */}
      <div className="lg:hidden mb-4">
        <Button
          variant="outline"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="w-full"
        >
          <ChevronDown className={`w-4 h-4 mr-2 ${showMobileFilters ? 'rotate-180' : ''}`} />
          Filters {hasActiveFilters && `(${Object.values(filters).filter(Boolean).length})`}
        </Button>
      </div>

      {/* Mobile Filters Modal */}
      {showMobileFilters && (
        <Card className="lg:hidden p-4 mb-4">
          {renderFilterContent()}
        </Card>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Card className="p-4 sticky top-20">
          <h3 className="font-semibold text-foreground mb-4">Filters</h3>
          {renderFilterContent()}
        </Card>
      </div>
    </>
  )
}
