import Nav from '@/components/Nav'
import ProfileView from '@/components/ProfileView'

export default async function ProfilePage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params

  return (
    <div className="min-h-screen relative">
      <Nav />
      <main className="relative z-10 max-w-3xl mx-auto px-6 pt-12 pb-20">
        <ProfileView address={address} />
      </main>
    </div>
  )
}
