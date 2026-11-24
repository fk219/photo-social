import { useId } from "react";

const SearchForm = ({ value, onChange, onSubmit, onClear, inputRef }) => {
  const inputId = useId();

  return (
    <form className="search-form" role="search" onSubmit={onSubmit}>
      <div className="search-field">
        <svg className="search-field-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4.1-4.1" />
        </svg>

        <label htmlFor={inputId} className="sr-only">
          Search Mosaic
        </label>

        <input
          ref={inputRef}
          id={inputId}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search people, posts and tags"
          autoComplete="off"
        />

        {value && (
          <button
            type="button"
            className="search-clear"
            onClick={onClear}
            aria-label="Clear search"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="m9 9 6 6M15 9l-6 6" />
            </svg>
          </button>
        )}
      </div>

      <button type="submit" className="button primary-button search-submit">
        Search
      </button>
    </form>
  );
};

export default SearchForm;
