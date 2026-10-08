package main

import (
 "io"
 "net/http"
 "net/http/httptest"
 "os"
 "path/filepath"
 "strings"
 "testing"
)

func TestOfflineGameAndRangeSupport(t *testing.T) {
 root := t.TempDir()
 if err := os.WriteFile(filepath.Join(root, "index.html"), []byte("<html>offline owner testing</html>"), 0600); err != nil { t.Fatal(err) }
 if err := os.MkdirAll(filepath.Join(root, "assets", "audio"), 0700); err != nil { t.Fatal(err) }
 if err := os.WriteFile(filepath.Join(root, "assets", "audio", "sound.mp3"), []byte("0123456789abcdef"), 0600); err != nil { t.Fatal(err) }
 server := httptest.NewServer(localHandler(root))
 defer server.Close()
 res, err := http.Get(server.URL + "/")
 if err != nil { t.Fatal(err) }
 body, _ := io.ReadAll(res.Body)
 res.Body.Close()
 if res.StatusCode != 200 || !strings.Contains(string(body), "offline owner testing") { t.Fatalf("local game index failed: %d %s",res.StatusCode,string(body)) }
 request, err := http.NewRequest(http.MethodGet, server.URL + "/assets/audio/sound.mp3", nil)
 if err != nil { t.Fatal(err) }
 request.Header.Set("Range", "bytes=0-3")
 response, err := http.DefaultClient.Do(request)
 if err != nil { t.Fatal(err) }
 partial, _ := io.ReadAll(response.Body)
 response.Body.Close()
 if response.StatusCode != http.StatusPartialContent || string(partial) != "0123" { t.Fatalf("audio range request failed: %d %q",response.StatusCode,string(partial)) }
 req, _ := http.NewRequest(http.MethodPost,server.URL+"/",nil)
 rejected, err := http.DefaultClient.Do(req)
 if err != nil { t.Fatal(err) }
 rejected.Body.Close()
 if rejected.StatusCode!=http.StatusMethodNotAllowed { t.Fatalf("local launcher should be read-only, got %d",rejected.StatusCode) }
}
