res=$(curl -s  https://api.github.com/repos/fabric8-analytics/fabric8-analytics-lsp-server/releases/latest | jq '. | { id: .id, upload_url: .upload_url }')

id=$(echo $res | jq .id)
upload_url=$(echo $res | jq .upload_url) 

echo $id
echo $upload_url

ls