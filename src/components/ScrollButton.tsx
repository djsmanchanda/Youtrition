'use client';

export default function ScrollButton() {
  const scrollToSection = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <button
      onClick={scrollToSection}
      className="bg-white hover:bg-gray-100 text-gray-800 px-8 py-3 rounded-full font-semibold transition-colors"
    >
      See How It Works
    </button>
  );
} 