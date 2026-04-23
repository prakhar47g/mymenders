import React from 'react';

export function AboutPage() {
  const initiatives = [
    { name: "Initiative 1", url: "https://framerusercontent.com/images/I832b7iZYGhar08MeqXTnrXE0TA.png" },
    { name: "Initiative 2", url: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSI4MCIgaGVpZ2h0PSIyMCIgZmlsbD0iIzEzMUMxOCIvPjxyZWN0IHg9IjEwIiB5PSI0MCIgd2lkdGg9IjgwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjMTMxQzE4Ii8+PHJlY3QgeD0iMTAiIHk9IjcwIiB3aWR0aD0iODAiIGhlaWdodD0iMjAiIGZpbGw9IiMxMzFDMTgiLz48L3N2Zz4=" },
  ];

  const supporters = [
    { name: "Supporter 1", url: "https://framerusercontent.com/images/vJF1QbF0EXixrZS1fTq0YedHPWE.png" },
    { name: "Supporter 2", url: "https://framerusercontent.com/images/7pyvLdQzMPkyxitxCpPjxuMFO9Q.png" }
  ];

  return (
    <div className="min-h-screen pt-16 bg-transparent text-slate-900 font-sans">
      <main className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        
        {/* Mission Section */}
        <section className="mb-24 text-center">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Our Mission</h3>
          <p className="text-xl md:text-2xl text-slate-600 leading-relaxed max-w-3xl mx-auto font-light">
            My Mender is a map-based, subscription-driven platform designed to extend the life of garments by reconnecting people with menders, repair knowledge, and the cultures of care that already exist - but remain fragmented and undervalued
          </p>
        </section>

        {/* Partners Section */}
        <section className="flex flex-col md:flex-row justify-center items-center md:items-start gap-16 md:gap-24">
          {/* Initiative Of */}
          <div className="flex flex-col items-center">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Initiative Of</h3>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-70 hover:opacity-100 transition-opacity">
              {initiatives.map((sponsor) => (
                <div key={sponsor.name} className="flex flex-col items-center gap-2">
                  <div className="w-40 h-20 bg-transparent rounded bg-contain bg-no-repeat bg-center mix-blend-multiply" style={{backgroundImage: `url("${sponsor.url}")`}}></div>
                </div>
              ))}
            </div>
          </div>

          {/* Supported By */}
          <div className="flex flex-col items-center">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Supported By</h3>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-70 hover:opacity-100 transition-opacity">
              {supporters.map((sponsor) => (
                <div key={sponsor.name} className="flex flex-col items-center gap-2">
                  <div className="w-40 h-20 bg-transparent rounded bg-contain bg-no-repeat bg-center mix-blend-multiply" style={{backgroundImage: `url("${sponsor.url}")`}}></div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
