//src/app/page.tsx
// src/app/page.tsx
import Image from "next/image";
import Link from "next/link";
import ScrollButton from "@/components/ScrollButton";
import { db } from "@/lib/db";

export default async function Home() {
  // Determine the next available profile ID
  const lastProfile = await db.profile.findFirst({ orderBy: { id: "desc" } });
  const nextId = (lastProfile?.id ?? 0) + 1;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className="
          relative h-[80vh] flex items-center justify-center
          bg-gradient-to-r from-green-100 to-red-100
          px-6 sm:px-8 lg:px-10
        "
      >
        <div className="absolute inset-0 z-0" />
        <div className="container mx-auto max-w-3xl text-center z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Plan Your Perfect Meal in Seconds
          </h1>
          <p className="text-xl md:text-2xl mb-8">
            Smart recipe recommendations tailored to what's already in your kitchen—and your nutrition goals.
          </p>
          <div className="flex flex-col items-center gap-4 justify-center">
            <Link
              href={`/${nextId}/setup`}
              className="
                bg-green-600 hover:bg-green-700 text-white
                px-8 py-3 rounded-full font-semibold
                transition-colors
              "
            >
              Get Started
            </Link>
            <ScrollButton
              className="
                inline-block text-gray-800 hover:text-green-600
                text-sm font-semibold
                px-6 py-3 rounded-full
                transition-colors
              "
            >
              See How It Works
            </ScrollButton>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-white-100 rounded-full flex items-center justify-center">
                <Image
                  src="/camera.png"
                  alt="Camera"
                  width={100}
                  height={100}
                  className="rounded-full"
                />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Snap or Enter Your Ingredients
              </h3>
              <p>Upload a photo of your fridge or type in what you've got.</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <Image
                  src="/chef.png"
                  alt="Chef"
                  width={100}
                  height={100}
                  className="rounded-full"
                />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Get Personalized Meal Plans
              </h3>
              <p>Our AI matches recipes to your pantry and dietary needs in real time.</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <Image
                  src="/cart.png"
                  alt="Cart"
                  width={100}
                  height={100}
                  className="rounded-full"
                />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Shop Smarter & Eat Better
              </h3>
              <p>Generate grocery lists, substitutes, and nutritional breakdowns instantly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Key Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-2">
                AI-Powered Recipe Database
              </h3>
              <p>Millions of recipes filtered for allergens, prep time, and nutrition.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-2">
                Pantry Sync & Smart Suggestions
              </h3>
              <p>Never let food go to waste—get recipes based on exactly what you have.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-2">
                Grocery Lists & Substitutes
              </h3>
              <p>Auto-generate your shopping list and find ingredient swaps.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-2">
                Nutrition Tracking & Goals
              </h3>
              <p>Set macros, log meals, and see your progress.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Profiles Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Meet Our Users
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Link href="/1" className="group">
              <div className="bg-gray-50 p-6 rounded-lg text-center transition-transform group-hover:scale-105">
                <Image
                  src="/Pablo.jpg"
                  alt="Pablo"
                  width={100}
                  height={100}
                  className="rounded-full mx-auto mb-4"
                />
                <h3 className="text-xl font-semibold mb-2">Pablo the Athlete</h3>
                <p>High-protein meal plans for peak performance</p>
              </div>
            </Link>
            <Link href="/2" className="group">
              <div className="bg-gray-50 p-6 rounded-lg text-center transition-transform group-hover:scale-105">
                <Image
                  src="/divjot.png"
                  alt="Divjot"
                  width={100}
                  height={100}
                  className="rounded-full mx-auto mb-4"
                />
                <h3 className="text-xl font-semibold mb-2">Divjot the Vegetarian</h3>
                <p>Plant-based favorites and alternatives</p>
              </div>
            </Link>
            <Link href={`/${nextId}/setup`} className="group">
              <div className="bg-gray-50 p-6 rounded-lg text-center transition-transform group-hover:scale-105">
                <Image
                  src="/custom.jpg"
                  alt="Custom"
                  width={100}
                  height={100}
                  className="rounded-full mx-auto mb-4"
                />
                <h3 className="text-xl font-semibold mb-2">Customize Your Own</h3>
                <p>Set your unique goals and preferences</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="bg-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-8">
            Ready to Plan Your First Meal?
          </h2>
          <Link
            href={`/${nextId}/setup`}
            className="
              inline-block bg-green-600 hover:bg-green-700 text-white
              px-8 py-3 rounded-full font-semibold
              transition-colors mb-8
            "
          >
            Start Your Free Demo
          </Link>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
            <Link href="#" className="hover:text-green-600">
              About
            </Link>
            <Link href="#" className="hover:text-green-600">
              Privacy
            </Link>
            <Link href="#" className="hover:text-green-600">
              Support
            </Link>
            <div className="flex gap-4">
              <a href="#" className="hover:text-green-600">
                Twitter
              </a>
              <a href="#" className="hover:text-green-600">
                Instagram
              </a>
              <a href="#" className="hover:text-green-600">
                Facebook
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
