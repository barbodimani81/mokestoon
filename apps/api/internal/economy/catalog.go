package economy

import "fmt"

func (c Catalog) validate() error {
	if c.Faaz < 1 || c.Points < 1 || c.DailyLimit < 1 || c.CooldownTicks < 0 {
		return fmt.Errorf("invalid playtest reward or pacing")
	}
	for _, friend := range []string{"barbod", "kavian", "mahan", "parsa", "parham"} {
		if len(c.Requests[friend]) == 0 {
			return fmt.Errorf("missing request pool for %s", friend)
		}
		for _, activity := range c.Requests[friend] {
			ticks := c.Minimum[activity]
			if ticks < 1 || ticks > 36000 {
				return fmt.Errorf("invalid duration for %s", activity)
			}
		}
	}
	items := map[string]Item{}
	for _, item := range c.Items {
		_, exists := items[item.ID]
		if item.ID == "" || item.Name == "" || item.Cost < 0 || exists {
			return fmt.Errorf("invalid catalog item %q", item.ID)
		}
		items[item.ID] = item
	}
	visiting, done := map[string]bool{}, map[string]bool{}
	var check func(string) error
	check = func(id string) error {
		if done[id] {
			return nil
		}
		item, ok := items[id]
		if !ok || visiting[id] {
			return fmt.Errorf("missing or circular prerequisite %q", id)
		}
		visiting[id] = true
		for _, required := range item.Prerequisites {
			if err := check(required); err != nil {
				return err
			}
		}
		delete(visiting, id)
		done[id] = true
		return nil
	}
	for id := range items {
		if err := check(id); err != nil {
			return err
		}
	}
	return nil
}
