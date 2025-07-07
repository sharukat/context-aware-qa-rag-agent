# Variables
BINARY_NAME=app
CMD_PATH=./cmd/app

# Default target when you run `make`
all: build

# Build binary
build:
	mkdir -p bin
	go build -o bin/$(BINARY_NAME) $(CMD_PATH)
	go install -v $(CMD_PATH)

# Run tests with coverage
test:
	go test -v -cover ./...

# Clean up generated files
clean:
	rm -rf bin