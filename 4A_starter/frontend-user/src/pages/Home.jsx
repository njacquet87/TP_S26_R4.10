// Home.jsx
import { useState, useEffect } from "react";

// Components
import Navbar from "../components/common/Navbar";
import Footer from "../components/layout/Footer";
import MovieCarousel from "../components/movies/MovieCarousel";
import MovieHeroCarousel from "../components/movies/MovieHeroCarousel";
import Loading from "../components/common/Loading";

// Context
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";

// Services
import { moviesAPI } from "../services/api";
import { genreColors } from "../services/genreColors";

// Page d'accueil
function Home() {
  // États locaux
  const [movies, setMovies] = useState([]);
  const [favoriteGenres, setFavoriteGenres] = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [recentMovies, setRecentMovies] = useState([]);
  const [moviesByFavoriteGenre, setMoviesByFavoriteGenre] = useState({});
  const [loading, setLoading] = useState(true);

  const { isAuthenticated, user } = useAuth();
  const { error } = useNotification();

  // Fonction pour charger les films
  const fetchMovies = async () => {
    try {
      setLoading(false);

      // Appel API avec fetch
      const response = await moviesAPI.getAll();

      if (response.success) {
        setMovies(response.data);
      } else {
        throw new Error(response.message || "Erreur lors du chargement");
      }
    } catch (err) {
      error(err.message);
      console.error("Error fetching movies:", err);
    } finally {
      setLoading(false);
    }
  };

  // Charger les films
  useEffect(() => {
    fetchMovies();
  }, []);

  // Charger les genres favoris de l'utilisateur depuis le contexte
  useEffect(() => {
    if (isAuthenticated() && user && Array.isArray(user.favoriteGenres)) {
      setFavoriteGenres(user.favoriteGenres);
    } else {
      setFavoriteGenres([]);
    }
  }, [isAuthenticated, user]);

  // Charger les films pour chaque genre favori
  useEffect(() => {
    const loadMoviesByFavoriteGenres = async () => {
      if (!isAuthenticated() || favoriteGenres.length === 0) {
        setMoviesByFavoriteGenre({});
        return;
      }

      try {
        const results = await Promise.all(
          favoriteGenres.map((genre) => moviesAPI.getByGenre(genre)),
        );

        const byGenre = {};
        results.forEach((res, index) => {
          const genre = favoriteGenres[index];
          if (res && res.success && Array.isArray(res.data)) {
            byGenre[genre] = res.data;
          } else {
            byGenre[genre] = [];
          }
        });

        setMoviesByFavoriteGenre(byGenre);
      } catch (err) {
        error(err.message);
        console.error("Error fetching movies by favorite genres:", err);
      }
    };

    loadMoviesByFavoriteGenres();
  }, [favoriteGenres, isAuthenticated, error]);

  // Charger les films populaires

  const fetchPopularMovies = async () => {
    try {
      setLoading(false);
      // Appel API avec fetch
      const response = await moviesAPI.getPopular();
      if (response.success) {
        setPopularMovies(response.data);
      } else {
        throw new Error(response.message || "Erreur lors du chargement");
      }
    } catch (err) {
      error(err.message);
      console.error("Error fetching movies:", err);
    } finally {
      setLoading(false);
    }
  };

  // Charger les films récents
  const fetchRecentMovies = async () => {
    try {
      setLoading(false);
      // Appel API avec fetch
      const response = await moviesAPI.getRecent();
      if (response.success) {
        setRecentMovies(response.data);
      } else {
        throw new Error(response.message || "Erreur lors du chargement");
      }
    } catch (err) {
      error(err.message);
      console.error("Error fetching movies:", err);
    } finally {
      setLoading(false);
    }
  };

  // Charger les carrousels populaires et récents au montage
  useEffect(() => {
    fetchPopularMovies();
    fetchRecentMovies();
  }, []);


  // État de chargement
  if (loading) {
    return <Loading message="Chargement des films..." />;
  }

  // Pas de films
  if (movies.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="container mx-auto px-4 py-24 text-center">
          <h2 className="text-3xl font-bold mb-4">Aucun film disponible</h2>
          <p className="text-gray-400">
            Revenez plus tard pour découvrir nos films.
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-black text-white min-h-screen">
      <Navbar movies={movies} onSearch={""} />

      {/* Hero Section */}
      <MovieHeroCarousel />

      <hr />

      {/* Préférences utilisateur */}
      {isAuthenticated() && (
        <div className="container mx-auto px-4 mt-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Vos genres favoris
          </h2>
          <div className="flex flex-wrap gap-3">
            {favoriteGenres.map((genre) => (
              <span
                key={genre}
                className={`${genreColors[genre] || "bg-gray-700"} text-white px-3 py-1 rounded-full text-sm`}
              >
                {genre}
              </span>
            ))}
          </div>
          {/* Films par genre préféré */}
          <div className="mt-10">
            <h3 className="text-xl md:text-3xl font-bold mb-4 underline">
              Films par genre préféré
            </h3>
            {favoriteGenres.map((genre) => {
              const genreMovies = moviesByFavoriteGenre[genre] || [];
              if (genreMovies.length === 0) return null;

              return (
                <MovieCarousel
                  key={genre}
                  title={genre}
                  movies={genreMovies}
                />
              );
            })}
          </div>
        </div>
      )}
      
      <hr />

      {/* Movies Lists */}

      <div className="container mx-auto">
        <MovieCarousel title="Films populaires" movies={popularMovies} />
        <MovieCarousel title="Films récents" movies={recentMovies} />
      </div>

      <Footer />
    </div>
  );
}

export default Home;
