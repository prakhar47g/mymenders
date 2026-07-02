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
    <div className="min-h-screen bg-transparent pt-16 font-sans text-[#171b17]">
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        
        {/* Mission Section */}
        <section className="mb-24 text-center">
          <h3 className="mb-4 text-[11px] font-medium uppercase tracking-[0.04em] text-[#8a877d]">Our Mission</h3>
          <p className="mx-auto max-w-3xl text-2xl font-light leading-[1.35] text-[#3d403b] md:text-[28px]">
            My Mender is a map-based, subscription-driven platform designed to extend the life of garments by reconnecting people with menders, repair knowledge, and the cultures of care that already exist - but remain fragmented and undervalued
          </p>
        </section>

        {/* Partners Section */}
        <section className="flex flex-col md:flex-row justify-center items-center md:items-start gap-16 md:gap-24">
          {/* Initiative Of */}
          <div className="flex flex-col items-center">
            <h3 className="mb-8 text-[11px] font-medium uppercase tracking-[0.04em] text-[#8a877d]">Initiative Of</h3>
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
            <h3 className="mb-8 text-[11px] font-medium uppercase tracking-[0.04em] text-[#8a877d]">Supported By</h3>
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
