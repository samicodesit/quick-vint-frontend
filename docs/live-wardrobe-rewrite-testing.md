# Live Wardrobe Rewrite Test

Use the shared instructions in [Real-Browser Testing](real-browser-testing.md)
and run:

```bash
npm run test:live:wardrobe
```

This check consumes one production generation credit. It uses real public
Vinted wardrobe/item/image data, but synthetic ownership and the existing edit
page fixture isolate Vinted's blocked authenticated-edit boundary. It verifies
Use suggestion, Undo, and Discard suggestion and never saves a listing.
