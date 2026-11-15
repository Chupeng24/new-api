package authz

var PlatformReportRead = Permission{Resource: "platform_report", Action: ActionRead}

func init() {
	RegisterResource(ResourceDefinition{
		Resource: "platform_report", LabelKey: "Platform reports",
		Actions: []ActionDefinition{{Action: ActionRead, LabelKey: "View anonymous platform totals", DescriptionKey: "Read aggregate platform usage without personal records", DefaultRoles: []string{BuiltInRoleAdmin}}},
	})
}
