import React from 'react';
import logo from './assets/logo1.png';

const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img src={logo} alt="Patch Explorer Logo" className="w-16 h-16" />
            <h1 className="text-7xl font-bold bg-indigo-600 bg-clip-text text-transparent">
              Patch Explorer
            </h1>
          </div>
          <p className="text-gray-600 text-lg mb-6">Understand your code diffs with ease</p>
          
          {/* Product Hunt Badge - Centered below tagline */}
          <div className="flex justify-center">
            <a href="https://www.producthunt.com/products/patch-explorer/reviews?utm_source=badge-product_review&utm_medium=badge&utm_source=badge-patch&#0045;explorer" target="_blank" rel="noopener noreferrer">
              <img src="https://api.producthunt.com/widgets/embed-image/v1/product_review.svg?product_id=1104257&theme=light" alt="Patch&#0032;Explorer - Understand&#0032;multiple&#0032;code&#0032;diffs&#0032;easily | Product Hunt" width="250" height="54" className="hover:opacity-80 transition-opacity" />
            </a>
          </div>
        </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                What is Patch Explorer?
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Imagine you have multiple diffs for different versions of a code change. 
                Patch Explorer makes it easy to review multiple diffs at the same time. 
                It provides an intuitive interface for 
                identifying common files across patches, and quickly finding the differences.
              </p>
            </section>

            
            <section className="text-center pt-8 border-t border-gray-200">
              <p className="text-gray-500 text-sm mt-4">
                &copy; 2025 Built with ❤️ by <a href="https://www.eastcoastsoft.com" target="_blank" rel="noopener noreferrer">East Coast Software LLC</a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
