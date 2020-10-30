/// <reference types="Cypress" />

describe("DOM interactions", () => {
    beforeEach(() => {
        cy.loadExtensionDefaults();
        cy.fixture("_shack_li_").then((li) => cy.setCookie("_shack_li_", li, { domain: "shacknews.com" }));
    });

    context("modifiers applied to the DOM at load", () => {
        it("user flairs enabled", () => {
            cy.visit("https://www.shacknews.com/chatty?id=40040034#item_40040034");

            cy.get("li.sel img.chatty-user-icons").first().should("have.css", "width", "10px");
            cy.get("li.sel img.chatty-user-icons").first().should("have.css", "filter", "grayscale(0.75)");
        });
        it("user flairs disabled", () => {
            cy.loadExtensionDefaults(
                { exclude: true },
                {
                    enabled_scripts: ["shrink_user_icons", "reduced_color_user_icons"],
                },
            );
            cy.reload();

            cy.get("li.sel img.chatty-user-icons").first().should("not.have.css", "width", "10px");
            cy.get("li.sel img.chatty-user-icons").first().should("not.have.css", "filter", "grayscale(0.75)");
        });

        it("lol tags enabled", () => {
            cy.visit("https://www.shacknews.com/chatty?id=40046772#item_40046772");

            cy.get(".fullpost .lol-tags").first().should("have.css", "display", "flex");
            cy.get(".oneline .lol-tags").eq(1).should("have.css", "display", "inline-block");
        });
        it("lol tags disabled", () => {
            cy.loadExtensionDefaults(null, { enabled_scripts: ["hide_tagging_buttons", "hide_tag_counts"] });
            cy.reload();

            cy.get(".fullpost .lol-tags").first().should("have.css", "display", "none");
            cy.get(".oneline .lol-tags").eq(1).should("have.css", "display", "none");
        });

        it("shame switchers enabled", () => {
            cy.loadExtensionDefaults(null, { enabled_scripts: ["switchers", "chatty_news"] });
            cy.visit("https://www.shacknews.com/chatty?id=40049133#item_40049133");

            cy.get("li li.sel span.user").should((user) => expect(user.text()).to.match(/\w+ - \(\w+\)/));
        });

        it("chatty-news enabled", () => {
            cy.get("ul#recent-articles li").and((items) => {
                expect(items.length).to.be.greaterThan(0);
                expect(items.find("a").attr("title")).length.to.be.greaterThan(0);
            });
        });

        it("CustomUserFilter on replies in single-thread mode", () => {
            cy.loadExtensionDefaults(null, { user_filters: ["Milleh"] });
            cy.visit("https://www.shacknews.com/chatty?id=40049762#item_40049762");

            cy.get(".oneline_user").each((ol) => expect(ol.text()).to.not.eq("Milleh"));
        });
        it("CustomUserFilter on thread in single-thread mode", () => {
            cy.loadExtensionDefaults(null, { user_filters: ["mechanicalgrape"] });
            cy.visit("https://www.shacknews.com/chatty?id=40041325#item_40041325");

            cy.get("li .fullpost").should("exist").and("be.visible");
            cy.get("li .oneline_user").should("not.exist");
        });

        it("HighlightUser highlighting", () => {
            cy.loadExtensionDefaults(
                { append: true },
                {
                    highlight_groups: [
                        {
                            name: "Another Group",
                            enabled: true,
                            built_in: false,
                            css: "color: cyan !important;",
                            users: ["Yo5hiki"],
                        },
                    ],
                },
            );
            cy.visit("https://www.shacknews.com/chatty?id=40049283#item_40049283");

            // check for 'color' 'yellow'
            cy.log("testing for op highlights");
            cy.get(".oneline.op .oneline_user").should("have.css", "color", "rgb(255, 255, 0)");
            // check for 'color' 'cyan'
            cy.log("testing for added user highlights");
            cy.get(".oneline_user:contains(Yo5hiki)").eq(0).should("have.css", "color", "rgb(0, 255, 255)");
        });

        it("PostPreview tag interactions", () => {
            cy.loadExtensionDefaults(null, { enabled_scripts: ["post_preview"] });
            cy.visit("https://www.shacknews.com/chatty?id=40053122#item_40053122");

            cy.log("test post-preview enablement persistence");
            cy.get("li div.reply > a").click();
            cy.get("#previewButton").click();
            cy.get("#frm_body").as("inputArea");
            cy.get("#previewArea").as("previewArea");
            cy.get("@previewArea").should("be.visible");
            cy.reload();
            cy.get("li div.reply > a").click();
            cy.get("@previewArea").should("be.visible");

            cy.log("test post-length counter");
            cy.get("@inputArea").type("This is a test of the post preview feature.");
            cy.get("@previewArea").should("be.visible").and("have.text", "This is a test of the post preview feature.");
            cy.get(".post_length_counter_text").should("have.text", "Characters remaining in post preview: 62");

            cy.log("test codeblock formatted output");
            cy.get("@inputArea").clear();
            cy.get("@inputArea")
                .type(
                    `&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&
&&&&&&&&&&&&&&&&&&&&&&%####%%&&&&&&&&&&&&&&&&&&&
&&&&&&&&&&&&&&&%(////(((((((((////(%&&&&&&&&&&&&
&&&&&&&&&&&%(//(%&&&&&&&&&&&&&&&&%#(//(%&&&&&&&&
&&&&&&&&&#//#&&&&%/.    .*%&&&&&&&&&&%///%&&&&&&
&&&&&&&%//#&&(,              ,(&&&&&&&&%(/(&&&&&
&&&&&&%%%/                        *%&&&&&#//#&&&
&&&%(,                                ,(%&#//%&&
&&&&#((%&&&.     (&&&&&&&&#.     &&&&&&&&&&//(&&
&&&&(/(%&&&,     /&&&&&&&&(     .&&&&&&&&&&%//%&
&&&&(/(%&&&*     /&&&&&&&&/     *&&&&&&&&&&#//%&
&&&&(//#&&&(     *&,.#&&&&/     (&&&&&&&&&&//(&&
&&&&%//(%&&#     *&&&&&&&&*     (&&&&&&&&&#//%&&
&&&&&%///%&%.    ,&&&&&&&&*     #&&&&&&&&(//#&&&
&&&&&&%(//(%*,,,,*&&&&&&&&/,,,,*%&&&&&&#//(&&&&&
&&&&&&&&%(//(%&&&&&&&&&&&&&&&&&&&&&&&#//(%&&&&&&
&&&&&&&&&&&#///(#%&&&&&&&&&&&&&&%#(///#%&&&&&&&&
&&&&&&&&&&&&&&%(//////((((((//////(%&&&&&&&&&&&&
&&&&&&&&&&&&&&&&&&&&%%######%%&&&&&&&&&&&&&&&&&&`,
                    { delay: 0 },
                )
                .type("{selectall}");

            const tagHTML =
                "&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;<br>&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;%####%%&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;<br>&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;%(////(((((((((////(%&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;<br>&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;%(//(%&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;%#(//(%&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;<br>&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;#//#&amp;&amp;&amp;&amp;%/.    .*%&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;%///%&amp;&amp;&amp;&amp;&amp;&amp;<br>&amp;&amp;&amp;&amp;&amp;&amp;&amp;%//#&amp;&amp;(,              ,(&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;%(/(&amp;&amp;&amp;&amp;&amp;<br>&amp;&amp;&amp;&amp;&amp;&amp;%%%/                        *%&amp;&amp;&amp;&amp;&amp;#//#&amp;&amp;&amp;<br>&amp;&amp;&amp;%(,                                ,(%&amp;#//%&amp;&amp;<br>&amp;&amp;&amp;&amp;#((%&amp;&amp;&amp;.     (&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;#.     &amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;//(&amp;&amp;<br>&amp;&amp;&amp;&amp;(/(%&amp;&amp;&amp;,     /&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;(     .&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;%//%&amp;<br>&amp;&amp;&amp;&amp;(/(%&amp;&amp;&amp;*     /&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;/     *&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;#//%&amp;<br>&amp;&amp;&amp;&amp;(//#&amp;&amp;&amp;(     *&amp;,.#&amp;&amp;&amp;&amp;/     (&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;//(&amp;&amp;<br>&amp;&amp;&amp;&amp;%//(%&amp;&amp;#     *&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;*     (&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;#//%&amp;&amp;<br>&amp;&amp;&amp;&amp;&amp;%///%&amp;%.    ,&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;*     #&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;(//#&amp;&amp;&amp;<br>&amp;&amp;&amp;&amp;&amp;&amp;%(//(%*,,,,*&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;/,,,,*%&amp;&amp;&amp;&amp;&amp;&amp;#//(&amp;&amp;&amp;&amp;&amp;<br>&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;%(//(%&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;#//(%&amp;&amp;&amp;&amp;&amp;&amp;<br>&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;#///(#%&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;%#(///#%&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;<br>&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;%(//////((((((//////(%&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;<br>&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;%%######%%&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;&amp;";
            cy.get("#shacktags_legend_table tr:nth-child(8) > td:nth-child(4) > a").click();
            cy.get("@previewArea")
                .find(".jt_code")
                .then((codeblock) => expect(codeblock[0].innerHTML).to.eq(tagHTML));
            cy.get("div.inlinereply").scrollIntoView({ offset: { top: -56 } });
        });
    });
});
