package main

import (
	"fmt"
	cmp "github.com/google/go-cmp/cmp"
)


func main() {
	fmt.Println("Test project")
	fmt.Println(cmp.Diff("Good", "Bad"))
}