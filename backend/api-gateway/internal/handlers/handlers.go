package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	m "github.com/sharukat/context-aware-qa-rag-agent/backend/api-gateway/internal/models"
	u "github.com/sharukat/context-aware-qa-rag-agent/backend/api-gateway/internal/utilities"
)

// CreateStreamHandler returns a handler function configured with a specific endpoint
func createStreamHandler(endpoint string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		decoder := json.NewDecoder(r.Body)
		defer r.Body.Close()

		var data m.Input
		if err := decoder.Decode(&data); err != nil {
			fmt.Println("Error decoding request body:", err)
			http.Error(w, fmt.Sprintf("Error decoding request body: %v", err), http.StatusBadRequest)
			return
		}

		err := u.StreamChat(data, w, endpoint)
		if err != nil {
			http.Error(w, fmt.Sprintf("Streaming error: %v", err), http.StatusInternalServerError)
			return
		}
	}
}

// Handler functions for the RAG microservice
func RAGHandlerFunc(w http.ResponseWriter, r *http.Request) {
	handler := createStreamHandler("http://localhost:8001/v1/rag/generate")
	handler(w, r)
}

// Handler functions for the searchj microservice
func SearchHandlerFunc(w http.ResponseWriter, r *http.Request) {
	handler := createStreamHandler("http://localhost:8002/v1/search")
	handler(w, r)
}

// Handler functions for the stocks microservice
func StocksHandlerFunc(w http.ResponseWriter, r *http.Request) {
	handler := createStreamHandler("http://localhost:8003/v1/mcp/stocks")
	handler(w, r)
}

// Handler functions for the upload files and create the vector database
func FileUploadHandlerFunc(w http.ResponseWriter, r *http.Request) {
	url := "http://localhost:8004/v1/file-upload"
	response, err := u.SendMultipartRequest("POST", url, r.Body, r.Header.Get("Content-Type"))
	if err != nil {
		http.Error(w, fmt.Sprintf("Error sending request to microservice: %v", err), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(response)
}
