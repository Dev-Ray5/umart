import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'

interface InvoiceItem {
  productId: string
  productName: string
  quantity: number
  price: number
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    let decodedToken

    try {
      decodedToken = await adminAuth.verifyIdToken(token)
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const currentUserId = decodedToken.uid
    const searchParams = req.nextUrl.searchParams
    const action = searchParams.get('action') // 'purchase' or 'sale'
    const transactionId = searchParams.get('id')

    if (!action || !['purchase', 'sale'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing action parameter (purchase or sale)' },
        { status: 400 }
      )
    }

    let query = adminDb.collection('transactions')

    if (action === 'purchase') {
      // Fetch transactions where current user is the buyer
      query = query.where('buyerId', '==', currentUserId)
    } else if (action === 'sale') {
      // Fetch transactions where current user is the seller
      query = query.where('sellerId', '==', currentUserId)
    }

    // If specific transaction ID requested, filter by document ID
    if (transactionId) {
      const allDocs = await query.get()
      const doc = allDocs.docs.find((d) => d.id === transactionId)

      if (!doc) {
        return NextResponse.json(
          { success: false, error: 'Transaction not found' },
          { status: 404 }
        )
      }

      const data = doc.data()

      return NextResponse.json(
        {
          success: true,
          data: {
            id: doc.id,
            buyerId: data.buyerId,
            sellerId: data.sellerId,
            reference: data.reference,
            items: data.items || [],
            shippingFee: data.shippingFee || 0,
            platformFee: data.platformFee || 0,
            price: data.price || 0,
            confirmed: data.confirmed || false,
            withdrawn: data.withdrawn || false,
            date: data.date,
            createdAt: data.createdAt,
          },
        },
        { status: 200 }
      )
    }

    // Fetch all transactions ordered by date descending
    const transactionsSnapshot = await query
      .orderBy('date', 'desc')
      .get()

    const transactions = transactionsSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        buyerId: data.buyerId,
        sellerId: data.sellerId,
        reference: data.reference,
        items: data.items || [],
        shippingFee: data.shippingFee || 0,
        platformFee: data.platformFee || 0,
        price: data.price || 0,
        confirmed: data.confirmed || false,
        withdrawn: data.withdrawn || false,
        date: data.date,
        createdAt: data.createdAt,
      }
    })

    return NextResponse.json(
      { success: true, data: transactions },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch transactions',
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    let decodedToken

    try {
      decodedToken = await adminAuth.verifyIdToken(token)
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const sellerId = decodedToken.uid
    const {
      buyerId,
      items,
      shippingFee,
      platformFee,
      price,
      reference,
    } = await req.json()

    // Validate required fields
    if (!buyerId || !items || items.length === 0 || shippingFee === undefined || !reference || price === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate unique transaction ID
    const timestamp = Date.now()
    const transactionId = `${buyerId}_${sellerId}_${timestamp}`

    // Create transaction document in root transactions collection
    const transactionData = {
      buyerId,
      sellerId,
      reference,
      items,
      shippingFee,
      platformFee,
      price,
      confirmed: false,
      withdrawn: false,
      date: Timestamp.now(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }

    await adminDb.collection('transactions').doc(transactionId).set(transactionData)

    // Update reference document to link transaction
    try {
      await adminDb.collection('references').doc(reference).update({
        transactionId,
        updatedAt: Timestamp.now(),
      })
    } catch (refError) {
      console.warn('Warning: Could not update reference document', refError)
      // Continue even if reference update fails
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          transactionId,
          reference,
          message: 'Transaction created successfully',
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create transaction',
      },
      { status: 500 }
    )
  }
}
