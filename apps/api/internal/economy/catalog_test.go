package economy

import "testing"

func TestDevelopmentCatalogConstraints(t *testing.T) {
	for _, alter := range []func(*Catalog){
		func(c *Catalog) { c.Faaz = -5 },
		func(c *Catalog) { c.Items[0].Cost = -1 },
		func(c *Catalog) { c.Items[0].Prerequisites = []string{"missing"} },
		func(c *Catalog) { c.Items[0].Prerequisites = []string{"activity.ps4"} },
		func(c *Catalog) { c.Items = append(c.Items, c.Items[0]) },
		func(c *Catalog) { delete(c.Minimum, "snack") },
	} {
		c := PlaytestCatalog()
		alter(&c)
		if c.validate() == nil {
			t.Fatal("invalid configuration accepted")
		}
	}
}
