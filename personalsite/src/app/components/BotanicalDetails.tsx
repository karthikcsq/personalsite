export function InteriorBotanicalFrame() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <svg
        viewBox="0 0 210 190"
        className="absolute -right-12 top-8 hidden h-48 w-52 opacity-40 sm:block md:-right-5 md:top-14 md:opacity-50"
        fill="none"
      >
        <path
          d="M209 11C171 25 144 47 123 74C99 104 71 125 23 141"
          stroke="var(--color-leaf)"
          strokeWidth="1.35"
          strokeLinecap="round"
        />
        <path d="M164 34C169 17 181 8 198 8C193 25 182 34 164 34Z" fill="var(--color-leaf-mid)" fillOpacity="0.76" stroke="var(--color-leaf)" strokeWidth="1.05" />
        <path d="M131 68C117 58 112 44 117 29C132 38 137 52 131 68Z" fill="var(--color-leaf-soft)" stroke="var(--color-leaf)" strokeWidth="1.05" />
        <path d="M99 100C103 83 114 73 131 71C128 88 117 98 99 100Z" fill="var(--color-leaf-mid)" fillOpacity="0.74" stroke="var(--color-leaf)" strokeWidth="1.05" />
        <path d="M62 124C49 113 46 99 52 84C66 94 70 108 62 124Z" fill="var(--color-leaf-soft)" stroke="var(--color-leaf)" strokeWidth="1.05" />
        <path d="M166 32L195 10M130 65L119 32M102 97L128 74M61 121L53 88" stroke="var(--color-leaf)" strokeWidth="0.6" strokeLinecap="round" opacity="0.72" />
      </svg>

      <svg
        viewBox="0 0 205 170"
        className="absolute -bottom-10 -left-24 h-36 w-44 opacity-30 sm:-left-16 sm:h-44 sm:w-52 md:-left-7 md:opacity-45"
        fill="none"
      >
        <path
          d="M2 162C29 132 57 111 89 97C124 82 151 60 180 18"
          stroke="var(--color-leaf)"
          strokeWidth="1.35"
          strokeLinecap="round"
        />
        <path d="M38 128C22 124 12 114 10 98C27 101 37 111 38 128Z" fill="var(--color-leaf-mid)" fillOpacity="0.76" stroke="var(--color-leaf)" strokeWidth="1.05" />
        <path d="M79 101C69 88 68 74 77 61C89 74 90 87 79 101Z" fill="var(--color-leaf-soft)" stroke="var(--color-leaf)" strokeWidth="1.05" />
        <path d="M115 83C119 66 130 56 147 54C144 71 133 81 115 83Z" fill="var(--color-leaf-mid)" fillOpacity="0.74" stroke="var(--color-leaf)" strokeWidth="1.05" />
        <path d="M153 51C143 39 143 25 151 12C163 24 164 38 153 51Z" fill="var(--color-leaf-soft)" stroke="var(--color-leaf)" strokeWidth="1.05" />
        <path d="M36 125L13 101M78 98L78 64M118 80L144 57M153 48L152 15" stroke="var(--color-leaf)" strokeWidth="0.6" strokeLinecap="round" opacity="0.72" />
      </svg>
    </div>
  );
}
