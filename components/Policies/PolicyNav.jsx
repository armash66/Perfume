import { ChevronRightIcon } from './Icons';

/**
 * PolicyNav — Sidebar / top navigation for selecting a policy.
 * On desktop: elegant vertical sidebar. On mobile: horizontal scrollable pills.
 */
export default function PolicyNav({ policies, activeId, onSelect }) {
  return (
    <nav aria-label="Policy navigation" className="w-full">
      {/* Desktop: vertical sidebar list */}
      <ul className="hidden lg:flex flex-col gap-1">
        {policies.map((policy) => {
          const Icon = policy.icon;
          const isActive = activeId === policy.id;

          return (
            <li key={policy.id}>
              <button
                onClick={() => onSelect(policy.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  group w-full flex items-center gap-4 px-5 py-4 rounded-2xl
                  transition-all duration-300 ease-out text-left cursor-pointer
                  ${isActive
                    ? 'bg-gradient-to-r from-[#0F3D3E] to-[#0a2c2d] shadow-lg shadow-[#0F3D3E]/10'
                    : 'hover:bg-[#F5ECD7]/60'
                  }
                `}
              >
                {/* Icon */}
                <span
                  className={`
                    flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                    transition-all duration-300
                    ${isActive
                      ? 'bg-[#E2C275]/20 text-[#E2C275]'
                      : 'bg-[#0F3D3E]/5 text-[#0F3D3E]/50 group-hover:bg-[#0F3D3E]/10 group-hover:text-[#0F3D3E]/70'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                </span>

                {/* Label */}
                <span className="flex-1 min-w-0">
                  <span
                    className={`
                      block text-[0.82rem] font-semibold tracking-wide transition-colors duration-300
                      ${isActive ? 'text-[#FFF8E7]' : 'text-[#0F3D3E] group-hover:text-[#0F3D3E]'}
                    `}
                  >
                    {policy.title}
                  </span>
                  <span
                    className={`
                      block text-[0.68rem] mt-0.5 transition-colors duration-300
                      ${isActive ? 'text-[#ECD9A3]/70' : 'text-[#0F3D3E]/40 group-hover:text-[#0F3D3E]/55'}
                    `}
                  >
                    {policy.tagline}
                  </span>
                </span>

                {/* Arrow */}
                <ChevronRightIcon
                  className={`
                    w-4 h-4 flex-shrink-0 transition-all duration-300
                    ${isActive
                      ? 'text-[#E2C275] translate-x-0 opacity-100'
                      : 'text-[#0F3D3E]/20 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-60'
                    }
                  `}
                />
              </button>
            </li>
          );
        })}
      </ul>

      {/* Mobile / Tablet: horizontal scrollable pills */}
      <div className="lg:hidden overflow-x-auto scrollbar-hide -mx-1 px-1">
        <ul className="flex gap-2.5 pb-2 min-w-max">
          {policies.map((policy) => {
            const Icon = policy.icon;
            const isActive = activeId === policy.id;

            return (
              <li key={policy.id}>
                <button
                  onClick={() => onSelect(policy.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`
                    flex items-center gap-2.5 px-4 py-2.5 rounded-full
                    transition-all duration-300 whitespace-nowrap cursor-pointer
                    text-[0.78rem] font-medium tracking-wide
                    ${isActive
                      ? 'bg-[#0F3D3E] text-[#FFF8E7] shadow-md shadow-[#0F3D3E]/15'
                      : 'bg-[#F5ECD7]/70 text-[#0F3D3E]/70 hover:bg-[#F5ECD7] hover:text-[#0F3D3E]'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {policy.title}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
