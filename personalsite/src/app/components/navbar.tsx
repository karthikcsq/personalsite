import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="text-white flex fixed justify-end top-4 left-0 w-full px-4 z-50">
      <div className="bg-transparent border border-gray-700 font-quicksand rounded-full px-8 py-3 flex items-center space-x-6 backdrop-blur-lg">
        <div className="flex space-x-4">
          <Link href="/" className="px-4 py-2 rounded-full hover:bg-gray-700">Home</Link>
          <Link href="/projects" className="px-4 py-2 rounded-full hover:bg-gray-700">Projects</Link>
          <Link href="/work" className="px-4 py-2 rounded-full hover:bg-gray-700">Work</Link>
          <Link href="/gallery" className="px-4 py-2 rounded-full hover:bg-gray-700">Gallery</Link>
          <Link href="/blog" className="px-4 py-2 rounded-full hover:bg-gray-700">Blog</Link>
        </div>
      </div>
    </nav>
  );
}