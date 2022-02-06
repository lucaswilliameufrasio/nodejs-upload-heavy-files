## Build all binaries 
build:
	$ go build -o bin/upload-heavy-files src/main.go
.PHONY: build

## Start compiled app
start:
	$ sh -c './bin/upload-heavy-files'
.PHONY: start

## Download all dependencies
get-deps:
	$ go get -d ./...
.PHONY: get-deps

## Update all dependencies
update-deps:
	$ go get -u ./...
.PHONY: update-deps

## Update all test dependencies
update-test-deps:
	$ go get -t -u ./...
.PHONY: update-test-deps

## Remove unused modules
clean-mod:
	$ go mod tidy
.PHONY: clean-mod