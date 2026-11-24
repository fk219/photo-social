const TABS = [
  { value: "all", label: "All" },
  { value: "people", label: "People" },
  { value: "posts", label: "Posts" },
  { value: "tags", label: "Tags" },
];

const SearchTabs = ({ active, onChange }) => (
  <nav className="search-tabs" aria-label="Search result types">
    {TABS.map((tab) => (
      <button
        key={tab.value}
        type="button"
        className={`search-tab${active === tab.value ? " is-active" : ""}`}
        aria-pressed={active === tab.value}
        onClick={() => onChange(tab.value)}
      >
        {tab.label}
      </button>
    ))}
  </nav>
);

export default SearchTabs;
