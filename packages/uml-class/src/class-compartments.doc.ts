/** Documentation for UML class compartment rendering behavior. */
export const classCompartmentDocumentation = {
  title: "Class diagram compartments",
  sections: [
    {
      heading: "Rendering model",
      body: [
        "Class diagram nodes compile to DiagramNode.compartments so the renderer can draw UML-style sections without affecting other diagram kinds.",
        "The name compartment renders stereotypes such as <<interface>>, <<abstract>>, and <<enum>> above the element name.",
      ],
    },
    {
      heading: "Members",
      body: [
        "Fields and methods render in separate member compartments with UML visibility markers: + public, - private, # protected, and ~ package.",
        "Empty field, method, or enum value sections are omitted, so empty classes render as a single name compartment.",
      ],
    },
  ],
} as const;
