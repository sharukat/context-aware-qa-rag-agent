package utilities

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	m "github.com/sharukat/context-aware-qa-rag-agent/backend/api-gateway/internal/models"
)

func streamResponse(method string, url string, data any, w http.ResponseWriter) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal data: %v", err)
	}

	request, err := http.NewRequest(method, url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}

	request.Header.Set("Content-Type", "application/json")
	client := &http.Client{
		Timeout: 0,
	}

	response, err := client.Do(request)
	if err != nil {
		return fmt.Errorf("failed to send request: %v", err)
	}
	defer response.Body.Close()

	// Set up SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Cache-Control")

	// Create a buffer to read the response
	reader := bufio.NewReader(response.Body)

	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			if err == io.EOF {
				break
			}
			return fmt.Errorf("failed to read response: %v", err)
		}
		fmt.Fprintf(w, "%s", line)
		w.(http.Flusher).Flush()
	}

	return nil
}

func StreamChat(data m.Input, w http.ResponseWriter, url string) error {
	err := streamResponse("POST", url, data, w)
	if err != nil {
		return fmt.Errorf("streaming error: %v", err)
	}

	return nil
}

func SendAPIRequest(method string, url string, data any) ([]byte, error) {
	var request *http.Request
	var err error
	var jsonData []byte

	jsonData, err = json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal data: %v", err)
	}

	request, err = http.NewRequest(method, url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	request.Header.Set("Content-Type", "application/json")
	client := &http.Client{
		Timeout: 120 * time.Second,
	}

	response, err := client.Do(request)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %v", err)
	}
	defer response.Body.Close()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %v", err)
	}
	return body, nil
}

// Sends a multipart form request to the an endpoint and returns the response
func SendMultipartRequest(method string, url string, formData io.Reader, contentType string) ([]byte, error) {
	request, err := http.NewRequest(method, url, formData)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	request.Header.Set("Content-Type", contentType)
	client := &http.Client{
		Timeout: 120 * time.Second,
	}

	response, err := client.Do(request)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %v", err)
	}
	defer response.Body.Close()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %v", err)
	}
	return body, nil
}
