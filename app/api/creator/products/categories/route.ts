import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

// GET: Fetch all product categories (public endpoint)
export async function GET(req: NextRequest) {
  try {
    console.log('[v0] Fetching categories from Firestore')
    const categoriesSnapshot = await adminDb.collection('productCategories').get()

    const categories = categoriesSnapshot.docs.map((doc) => {
      const data = doc.data()
      console.log('[v0] Category document:', { id: doc.id, ...data })
      return {
        id: doc.id,
        ...data,
      }
    })

    console.log('[v0] Categories fetched successfully:', categories)
    return NextResponse.json(
      {
        success: true,
        data: categories,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[v0] Error fetching categories:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch categories',
      },
      { status: 500 }
    )
  }

// POST: Add new product category (admin only - not exposed to creators)
export async function POST(req: NextRequest) {
  // This endpoint exists but should only be called by admin users
  // For now, we return 403 to restrict access
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint is restricted to administrators',
    },
    { status: 403 }
  )
}
