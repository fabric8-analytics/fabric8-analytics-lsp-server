package pck

import (
	"fmt"
	cmp "github.com/google/go-cmp/cmp"
	cmpopts "github.com/google/go-cmp/cmp/cmpopts"
)

func pck1_func1() {
	fmt.Println("This is package 1 and function 1")
	fmt.Println(cmp.Diff("Hello", "Hello 123"))
	fmt.Println(cmpopts.AnyError)
} 
