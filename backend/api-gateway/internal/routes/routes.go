package routes

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	h "github.com/sharukat/context-aware-qa-rag-agent/backend/api-gateway/internal/handlers"
)

func LoadRoutes() *chi.Mux {
	router := chi.NewRouter()
	router.Use(middleware.Logger)
	router.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	router.Route("/v1/api", loadServiceRoutes)
	return router
}

func loadServiceRoutes(router chi.Router) {
	router.Post("/rag", h.RAGHandlerFunc)
	router.Post("/stocks", h.StocksHandlerFunc)
	router.Post("/search", h.SearchHandlerFunc)
	router.Post("/file-upload", h.FileUploadHandlerFunc)
}
