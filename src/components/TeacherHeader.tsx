"use client";

interface TeacherHeaderProps {
  title: string;
  subtitle?: string;
  subtitleColor?: string;
  stats?: Array<{
    label: string;
    value: string | number;
    valueColor?: string;
  }>;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
}

export default function TeacherHeader({
  title,
  subtitle,
  subtitleColor = "#5b3ebf",
  stats = [],
  searchPlaceholder = "Search...",
  onSearch
}: TeacherHeaderProps) {
  return (
    <>
      {/* Top Navigation Bar */}
      <header
        className="h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20 backdrop-blur-md"
        style={{ backgroundColor: "rgba(253, 247, 255, 0.8)" }}
      >
        <h2
          className="font-headline text-lg lg:text-xl font-bold"
          style={{ color: "#1c1a22" }}
        >
          Attendance Management
        </h2>
        <div className="flex items-center gap-2 lg:gap-6">
          {/* Search Bar - Hidden on small mobile, visible on md+ */}
          <div className="hidden md:block relative">
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: "#484553" }}
            >
              search
            </span>
            <input
              className="border-none rounded-full py-2 pl-10 pr-4 text-sm w-48 lg:w-64 focus:ring-2 focus:ring-[#5b3ebf] transition-all outline-none"
              placeholder={searchPlaceholder}
              type="text"
              style={{ backgroundColor: "#e6e0ec", color: "#1c1a22" }}
              onChange={(e) => onSearch?.(e.target.value)}
            />
          </div>
          {/* Action Buttons */}
          <div className="flex items-center gap-2 lg:gap-4">
            <button
              className="w-9 h-9 lg:w-10 lg:h-10 flex items-center justify-center rounded-full transition-colors"
              style={{ color: "#484553" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#ece6f1")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              <span className="material-symbols-outlined text-base lg:text-xl">help</span>
            </button>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full overflow-hidden border-2" style={{ borderColor: '#e6e0ec' }}>
              <img
                alt="User Avatar"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD__NsPqKYtlRm9fRKN5UCAPgbWqTN_36QZNbTj2TSl2En7OrhpRZHmg-Gj1xJr4uCeze53ZJWM1Vk3eR77w99sr_a31raGwI0I6I2vxBGvWv1CfjoqMQtzacv3Rndxsmls5n4AKdhu_p9utzYzhbb1HwlX4TrLZE2JiTwJwE5DCKQvc4brSPYuLTDRzzq9ZIkz00BJluaTzYy2GJg4kQkEhUzih9dMTknOzOLGBUyc1uO4ltNBUqjKKbCnZw_ITovK_O6vn3uo"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Page Header Section */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 px-4 lg:px-8 pt-6 lg:pt-8 pb-4">
        <div className="w-full sm:w-auto">
          <h3
            className="font-headline text-3xl sm:text-4xl font-extrabold -tracking-wide"
            style={{ color: "#1c1a22" }}
          >
            {title}
          </h3>
        </div>
        {stats.length > 0 && (
          <div className="flex gap-2 lg:gap-4 w-full sm:w-auto overflow-x-auto">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="px-4 lg:px-6 py-2 lg:py-3 rounded-lg text-right shrink-0"
                style={{ backgroundColor: "#ffffff" }}
              >
                <p
                  className="font-label text-[10px] uppercase tracking-tighter"
                  style={{ color: "#484553" }}
                >
                  {stat.label}
                </p>
                <p
                  className="font-headline text-xl lg:text-2xl font-bold leading-none"
                  style={{ color: stat.valueColor || "#1c1a22" }}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
