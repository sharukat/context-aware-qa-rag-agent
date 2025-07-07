package models

type ResponseStruct struct {
	Response []byte `json:"response"`
	Error    error  `json:"error"`
}

type Input struct {
	Question string `json:"question"`
	ChatId   string `json:"chatId"`
}

type StreamingResponse struct {
	Content   string     `json:"content,omitempty"`
	Citations []Citation `json:"citations,omitempty"`
	Error     string     `json:"error,omitempty"`
}

type Citation struct {
	Title    string `json:"title"`
	Citation string `json:"citation"`
}
