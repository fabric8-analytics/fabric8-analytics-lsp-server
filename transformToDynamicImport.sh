find dist/ | grep -E 'js$' | xargs -i sed -i 's/require("@RHEcosystemAppEng\/exhort-javascript-api")/import("@RHEcosystemAppEng\/exhort-javascript-api")/g' {}