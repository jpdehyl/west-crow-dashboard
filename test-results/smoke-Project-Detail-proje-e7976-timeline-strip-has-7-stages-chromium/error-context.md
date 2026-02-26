# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]: West Crow
        - generic [ref=e6]: Contracting
      - navigation [ref=e7]:
        - link "Dashboard" [ref=e8] [cursor=pointer]:
          - /url: /
        - link "Pipeline" [ref=e9] [cursor=pointer]:
          - /url: /bids
        - link "Projects" [ref=e10] [cursor=pointer]:
          - /url: /projects
        - link "Clients" [ref=e11] [cursor=pointer]:
          - /url: /clients
      - link "+ New Bid" [ref=e13] [cursor=pointer]:
        - /url: /bids/new
    - main [ref=e14]:
      - generic [ref=e16]:
        - heading "404" [level=1] [ref=e17]
        - heading "This page could not be found." [level=2] [ref=e19]
  - alert [ref=e20]
```