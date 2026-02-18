import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin SDK
let db: any

if (!getApps().length) {
  try {
    initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_SDK_KEY || '{}')),
    })
  } catch {
    console.error('Firebase Admin initialization failed')
  }
}

db = getFirestore()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')?.toLowerCase() || ''
    const minPrice = searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : 0
    const maxPrice = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : Infinity
    const location = searchParams.get('location') || ''
    const maxAgeYears = searchParams.get('maxAge') ? parseInt(searchParams.get('maxAge')!) : Infinity
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
    const isSuggestion = limit <= 10 // Treat as suggestion if limit is small

    // Build query
    let productsQuery = db.collection('products').where('status', '==', 'active')

    // Filter by price
    if (minPrice > 0) {
      productsQuery = productsQuery.where('price', '>=', minPrice)
    }
    if (maxPrice !== Infinity) {
      productsQuery = productsQuery.where('price', '<=', maxPrice)
    }

    // Filter by location
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
      .filter((product: { searchKeywords: never[]; title: string; brand: string; model: string; description: string; productAge: { value: number; unit: string } }) => {
        // Filter by search keywords
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
        if (maxAgeYears !== Infinity && product.productAge) {
          const ageInYears = convertAgeToYears(product.productAge)
          if (ageInYears > maxAgeYears) {
            return false
          }
        }

        return true
      })
      .sort((a: { createdAt: string | number | Date }, b: { createdAt: string | number | Date }) => {
        // Sort by creation date (newest first)
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA
      })
      .slice(0, limit)

    // For suggestion requests, return simplified data
    if (isSuggestion) {
      const simplifiedData = products.map((product) => ({
        id: product.id,
        title: product.title,
        brand: product.brand,
        price: product.price,
        images: product.images || [],
      }))

      return NextResponse.json({
        success: true,
        data: simplifiedData,
        total: products.length,
      })
    }

    return NextResponse.json({
      success: true,
      data: products,
      total: products.length,
    })
  } catch (error: any) {
    console.error('Products search error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to search products' },
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
