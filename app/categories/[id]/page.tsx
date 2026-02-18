import CategoriesBrowseClient from './client'

export const metadata = {
  title: 'Browse Category - Umart',
  description: 'Browse products in category',
}

export default function CategoryBrowsePage({ params }: { params: { id: string } }) {
  return <CategoriesBrowseClient categoryId={params.id} />
}
