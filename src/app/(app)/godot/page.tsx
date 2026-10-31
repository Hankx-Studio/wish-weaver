import { redirect } from 'next/navigation';

// The Godot build graduated to /play; keep the old URL working.
export default async function GodotPage() {
  redirect('/play');
}
