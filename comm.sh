cd client
npm run build
cp -R build/. ../public
rm -rf build
cd ../public
mv index.html ../views
