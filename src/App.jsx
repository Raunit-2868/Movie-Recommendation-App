import React, { useEffect, useState, useCallback, useRef } from "react";
import Search from "./components/Search";
import MovieCard from "./components/MovieCard";
import MovieModal from "./components/MovieModal";
import { useDebounce } from "react-use";
import { getTrendingMovies, updateSearchCount } from "./appwrite";

const API_BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

const API_OPTIONS = {
  method: "GET",
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${API_KEY}`,
  },
};

const App = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // const [open, setOpen] = useState("")

  const [errorMessage, setErrorMessage] = useState("");

  const [movieList, setMovieList] = useState([]);

  const [trendingMovies, setTrendingMovies] = useState([]);

  const [isLoading, setIsLoading] = useState(false);

  const [selectedMovie, setSelectedMovie] = useState(null);

  const [page, setPage] = useState(1);

  const [hasMore, setHasMore] = useState(true);

  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [_totalPages, setTotalPages] = useState(0);

  // USING DEBOUNCED SEARCH SO TH API CALLS AFTER HALF A SECOND
  // +++++++++++++++++++VERY VERY IMPORTANT++++++++++++++++++++++++++++++++++++++++++++

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const observer = useRef();
  const searchRef = useRef(null);

  // Global keyboard event handler
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check if "/" is pressed and we're not already in an input field
      if (
        event.key === "/" &&
        !["INPUT", "TEXTAREA"].includes(event.target.tagName)
      ) {
        event.preventDefault(); // Prevent "/" from being typed
        searchRef.current?.focus();
      }

      //  ESC to blur the search input
      if (event.key === "Escape" && event.target === document.activeElement) {
        event.target.blur();
      }
    };

    // Add event listener to document
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const lastMovieElementRef = useCallback(
    (node) => {
      if (isLoadingMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [isLoadingMore, hasMore],
  );

  useDebounce(() => setDebouncedSearchTerm(searchTerm), 500, [searchTerm]);

  const fetchMovies = async (query = "", pageNum = 1, isLoadMore = false) => {
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage("");

    try {
      const endpoint = query
        ? `${API_BASE_URL}/search/movie?query=${encodeURIComponent(
            query,
          )}&page=${pageNum}`
        : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc&page=${pageNum}`;

      const response = await fetch(endpoint, API_OPTIONS);

      if (!response.ok) {
        throw new Error("Failed to fetch movies");
      }

      const data = await response.json();

      if (data.response === "False") {
        setErrorMessage(data.Error || "Failed to fetch movies");
        if (!isLoadMore) {
          setMovieList([]);
        }
        return;
      }

      setTotalPages(data.total_pages);
      setHasMore(pageNum < data.total_pages);

      if (isLoadMore) {
        setMovieList((prevMovies) => [...prevMovies, ...data.results]);
      } else {
        setMovieList(data.results || []);
      }

      if (query && data.results.length > 0 && !isLoadMore) {
        await updateSearchCount(query, data.results[0]);
      }
    } catch (error) {
      console.error(`Error While Fetching Movies: ${error}`);
      setErrorMessage("Error Fetching Movies, Please Try Again Later.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadTrendingMovies = async () => {
    try {
      const movies = await getTrendingMovies();
      setTrendingMovies(movies);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (debouncedSearchTerm) {
      setPage(1);
      setHasMore(true);
      fetchMovies(debouncedSearchTerm, 1);
    } else {
      setPage(1);
      setHasMore(true);
      fetchMovies("", 1);
    }
  }, [debouncedSearchTerm]);

  useEffect(() => {
    if (page > 1) {
      fetchMovies(debouncedSearchTerm, page, true);
    }
  }, [page]);

  useEffect(() => {
    loadTrendingMovies();
  }, []);

  const handleMovieClick = (movie) => {
    setSelectedMovie(movie);
  };

  const handleCloseModal = () => {
    setSelectedMovie(null);
  };

  const handleTrendingMovieClick = async (movie) => {
    try {
      // Fetch movie details from TMDB first
      const response = await fetch(
        `${API_BASE_URL}/movie/${movie.movie_id}`,
        API_OPTIONS,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch movie details");
      }

      const tmdbMovie = await response.json();
      setSelectedMovie(tmdbMovie);
    } catch (error) {
      console.error("Error fetching movie details:", error);
      // Fallback to basic data if fetch fails
      const fallbackMovie = {
        id: movie.movie_id,
        title: movie.title,
        poster_path: movie.poster_url.split("/").pop(),
        vote_average: 0,
        original_language: "en",
        release_date: "",
      };
      setSelectedMovie(fallbackMovie);
    }
  };

  return (
    <main>
      <div className="pattern" />
      <div className="wrapper">
        <header>
          <img src="/hero-img.png" alt="hero img" />
          <h1>
            Find The <span className="text-gradient">Movies</span> That You'll
            Enjoy Without Hassle
          </h1>
          <Search
            ref={searchRef}
            search={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        </header>

        {trendingMovies.length > 0 && (
          <section className="trending">
            <h2>Trending Movies</h2>

            <ul>
              {trendingMovies.map((movie, index) => (
                <li
                  key={movie.$id}
                  onClick={() => handleTrendingMovieClick(movie)}
                  className="cursor-pointer transition-transform hover:scale-105"
                >
                  <p>{index + 1}</p>
                  <img src={movie.poster_url} alt={movie.title} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <div className="all-movies">
            <h2>All Movies</h2>
            {/* {errorMessage && <p className='text-red-500'>{errorMessage}</p>} */}

            {isLoading && !isLoadingMore ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-light-200"></div>
              </div>
            ) : errorMessage ? (
              <p className="text-red-500">{errorMessage}</p>
            ) : (
              <ul>
                {movieList.map((movie, index) => (
                  <li
                    key={`${movie.id}-${index}`}
                    ref={
                      index === movieList.length - 1
                        ? lastMovieElementRef
                        : null
                    }
                  >
                    <MovieCard movie={movie} onMovieClick={handleMovieClick} />
                  </li>
                ))}
              </ul>
            )}

            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-light-200"></div>
              </div>
            )}
          </div>
        </section>

        <h1 className="text-white">{searchTerm}</h1>
      </div>

      {selectedMovie && (
        <MovieModal movie={selectedMovie} onClose={handleCloseModal} />
      )}
    </main>
  );
};

export default App;
