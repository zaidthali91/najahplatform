'use client'
export default function SubjectPage({ params }: { params: { subject: string } }) {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h1>مادة: {params.subject}</h1>
    </div>
  )
}
