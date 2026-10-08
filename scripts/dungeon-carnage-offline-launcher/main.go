// A local, loopback-only web server for an authorised Dungeon Carnage
// offline-testing package. This opens the user's default browser; it does
// not modify the production website or request Supabase authentication.
package main

import (
 "fmt"
 "net"
 "net/http"
 "os"
 "os/exec"
 "path/filepath"
 "runtime"
 "strings"
)

func localHandler(root string) http.Handler {
 static := http.FileServer(http.Dir(root))
 return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
  if r.Method != http.MethodGet && r.Method != http.MethodHead {
   w.WriteHeader(http.StatusMethodNotAllowed)
   return
  }
  w.Header().Set("X-Content-Type-Options", "nosniff")
  w.Header().Set("Cache-Control", "no-store")
  static.ServeHTTP(w, r)
 })
}

func openBrowser(url string) error {
 if runtime.GOOS != "windows" { return nil }
 return exec.Command("rundll32.exe", "url.dll,FileProtocolHandler", url).Start()
}

func run() error {
 exe, err := os.Executable()
 if err != nil { return fmt.Errorf("find launcher location: %w", err) }
 root := filepath.Join(filepath.Dir(exe), "game")
 for _, needed := range []string{"index.html", "version.json", "release-manifest.json"} {
  info, err := os.Stat(filepath.Join(root, needed))
  if err != nil || info.IsDir() {
   return fmt.Errorf("game package incomplete: expected game/%s beside the launcher", needed)
  }
 }
 listener, err := net.Listen("tcp", "127.0.0.1:0")
 if err != nil { return fmt.Errorf("start private local game server: %w", err) }
 defer listener.Close()
 url := "http://" + listener.Addr().String() + "/"
 fmt.Println("C64 DUNGEON CARNAGE — OWNER OFFLINE TEST")
 fmt.Println("The game is served only on this computer.")
 fmt.Println("Open in browser: " + url)
 fmt.Println("Leave this window open while testing. Close this window to stop the local server.")
 if strings.TrimSpace(os.Getenv("CCG_DUNGEON_SKIP_BROWSER")) != "1" {
  if err := openBrowser(url); err != nil {
   fmt.Println("Could not open the browser automatically. Open the URL above manually.")
  }
 }
 return http.Serve(listener, localHandler(root))
}

func main() {
 if err := run(); err != nil {
  fmt.Fprintln(os.Stderr, "C64 Dungeon Carnage:", err)
  fmt.Fprintln(os.Stderr, "Press Enter to close.")
  fmt.Scanln()
  os.Exit(1)
 }
}
