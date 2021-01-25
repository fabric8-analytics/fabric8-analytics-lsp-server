module.exports = {
  prepare: [
    {
      path: "@semantic-release/exec",
      cmd: "npm run build && cp package-lock.json output",
    },
    "@semantic-release/npm",
    {
      // build the Linux executable
      "path": "@semantic-release/exec",
      "cmd": "pkg . -t node12-linux-x64 -o analytics-lsp-linux"
    },
    {
      // build the macOS executable
      "path": "@semantic-release/exec",
      "cmd": "pkg . -t node12-macos-x64 -o analytics-lsp-macos"
    },
    {
      // build the windows executable
      "path": "@semantic-release/exec",
      "cmd": "pkg . -t node12-win-x64 -o analytics-lsp-win.exe"
    },
    {
      // shasum
      "path": "@semantic-release/exec",
      "cmd": "shasum -a 256 analytics-lsp-linux > analytics-lsp-linux.sha256 && shasum -a 256 analytics-lsp-macos > analytics-lsp-macos.sha256 && shasum -a 256 analytics-lsp-win.exe > analytics-lsp-win.sha256"
    },
  ],
  publish: [
    {
      // install deps and create release tarball for intellij use.
      path: "@semantic-release/exec",
      cmd: "cd output && npm i --only=prod && echo ${nextRelease.version}>VERSION && tar cvjf ../ca-lsp-server.tar ."
    },
    {
      path: "@semantic-release/github",
      assets: [
        {
          path: "ca-lsp-server.tar"
        },
        {
          path: "analytics-lsp-linux",
          name: "analytics-lsp-linux",
          label: "analytics-lsp-server"
        },
        {
          path: "analytics-lsp-macos",
          name: "analytics-lsp-macos",
          label: "analytics-lsp-macos"
        },
        {
          path: "analytics-lsp-win",
          name: "analytics-lsp-win",
          label: "analytics-lsp-win"
        },
        {
          path: "analytics-lsp-linux.sha256",
          name: "analytics-lsp-linux.sha256",
          label: "analytics-lsp-server.sha256"
        },
        {
          path: "analytics-lsp-macos.sha256",
          name: "analytics-lsp-macos.sha256",
          label: "analytics-lsp-macos.sha256"
        },
        {
          path: "analytics-lsp-win.sha256",
          name: "analytics-lsp-win.sha256",
          label: "analytics-lsp-win.sha256"
        },
      ]
    },
    "@semantic-release/npm",
  ]
}
