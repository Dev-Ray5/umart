import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const query = searchParams.get('q')?.toLowerCase() || ''
    const minPrice = searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : 0
    const maxPrice = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : Infinity
    const location = searchParams.get('location') || ''
    const maxAge = searchParams.get('maxAge') ? parseInt(searchParams.get('maxAge')!) : Infinity
    const color = searchParams.get('color') || ''
    const size = searchParams.get('size') || ''
    const gender = searchParams.get('gender') || ''
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20

    // Validate category parameter
    if (!category) {
      return NextResponse.json(
        { error: 'Category parameter is required' },
        { status: 400 }
      )
    }

    // Build base query for products in this category
    let productsQuery = adminDb
      .collection('products')
      .where('status', '==', 'active')
      .where('category', '==', category)

    // Apply price filters
    if (minPrice > 0) {
      productsQuery = productsQuery.where('price', '>=', minPrice)
    }
    if (maxPrice !== Infinity) {
      productsQuery = productsQuery.where('price', '<=', maxPrice)
    }

    // Apply location filter
    if (location) {
      productsQuery = productsQuery.where('location', '==', location)
    }

    const snapshot = await productsQuery.limit(100).get()

    let products = snapshot.docs
      .map((doc: { data: () => any; id: any }) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
        }
      })
      .filter((product: any) => {
        // Filter by search query
        if (query) {
          const keywords = product.searchKeywords || []
          const matchesKeywords = keywords.some((keyword: string) =>
            keyword.toLowerCase().includes(query)
          )
          const matchesTitle = product.title?.toLowerCase().includes(query)
          const matchesBrand = product.brand?.toLowerCase().includes(query)
          const matchesModel = product.model?.toLowerCase().includes(query)
          const matchesDescription = product.description?.toLowerCase().includes(query)

          if (!matchesKeywords && !matchesTitle && !matchesBrand && !matchesModel && !matchesDescription) {
            return false
          }
        }

        // Filter by product age
        if (maxAge !== Infinity && product.productAge) {
          const ageInYears = convertAgeToYears(product.productAge)
          if (ageInYears > maxAge) {
            return false
          }
        }

        // Filter by color (from additionalInfo)
        if (color && product.additionalInfo?.color) {
          const productColor = String(product.additionalInfo.color).toLowerCase()
          if (!productColor.includes(color.toLowerCase())) {
            return false
          }
        }

        // Filter by size (from additionalInfo)
        if (size && product.additionalInfo?.size) {
          const productSize = String(product.additionalInfo.size).toLowerCase()
          if (!productSize.includes(size.toLowerCase())) {
            return false
          }
        }

        // Filter by gender (from additionalInfo)
        if (gender && product.additionalInfo?.gender) {
          const productGender = String(product.additionalInfo.gender).toLowerCase()
          if (!productGender.includes(gender.toLowerCase())) {
            return false
          }
        }

        return true
      })
      .sort((a: { createdAt: string | number | Date }, b: { createdAt: string | number | Date }) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA
      })
      .slice(0, limit)

    // Extract filter options from filtered products for dynamic suggestions
    const filterOptions = extractFilterOptions(products)

    return NextResponse.json({
      success: true,
      data: products,
      total: products.length,
      filterOptions,
    })
  } catch (error: any) {
    console.error('Category products search error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to search products in category' },
      { status: 500 }
    )
  }
}

function convertAgeToYears(productAge: { value: number; unit: string }): number {
  if (!productAge || !productAge.unit) return 0

  switch (productAge.unit.toLowerCase()) {
    case 'days':
      return productAge.value / 365
    case 'months':
      return productAge.value / 12
    case 'years':
      return productAge.value
    default:
      return 0
  }
}

function extractFilterOptions(products: any[]): any {
  const filterOptions = {
    priceRange: {
      min: Infinity,
      max: 0,
    },
    colors: new Set<string>(),
    sizes: new Set<string>(),
    genders: new Set<string>(),
    repairCounts: new Set<number>(),
  }

  products.forEach((product) => {
    // Price range
    if (product.price) {
      filterOptions.priceRange.min = Math.min(filterOptions.priceRange.min, product.price)
      filterOptions.priceRange.max = Math.max(filterOptions.priceRange.max, product.price)
    }

    // Additional info filters
    if (product.additionalInfo) {
      if (product.additionalInfo.color) {
        filterOptions.colors.add(String(product.additionalInfo.color))
      }
      if (product.additionalInfo.size) {
        filterOptions.sizes.add(String(product.additionalInfo.size))
      }
      if (product.additionalInfo.gender) {
        filterOptions.genders.add(String(product.additionalInfo.gender))
      }
      if (product.additionalInfo.repairs !== undefined) {
        filterOptions.repairCounts.add(Number(product.additionalInfo.repairs))
      }
    }
  })

  return {
    priceRange: {
      min: filterOptions.priceRange.min === Infinity ? 0 : filterOptions.priceRange.min,
      max: filterOptions.priceRange.max === 0 ? 1000000 : filterOptions.priceRange.max,
    },
    colors: Array.from(filterOptions.colors).sort(),
    sizes: Array.from(filterOptions.sizes).sort((a, b) => Number(a) - Number(b)),
    genders: Array.from(filterOptions.genders).sort(),
    repairCounts: Array.from(filterOptions.repairCounts).sort((a, b) => a - b),
  }
}
