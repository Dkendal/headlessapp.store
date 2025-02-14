import builder, { BuilderComponent, BuilderContent } from "@builder.io/react";

import { GetStaticPaths, GetStaticProps } from "next";
import React, { useEffect, useState } from "react";
import { GetApp } from "../../components/GetApp";
import Layout from "../../components/Layout";
import { AppInfo } from "../../interfaces/app";

builder.init("c33bcd23c29e45789677ba9aaaa7ce1d");

type Props = {
  app?: AppInfo;
  initialBuilderJson?: BuilderComponent | null;
  errors?: string;
  initialTemplate?: number;
};

const AppPage = ({
  app,
  errors,
  initialBuilderJson,
  initialTemplate,
}: Props) => {
  const [showBuilderDrawer, setShowBuilderDrawer] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(initialTemplate || 0);

  if (errors) {
    return (
      <Layout title="Error | Next.js + TypeScript Example">
        <p>
          <span className="text-red-800">Error:</span> {errors}
        </p>
      </Layout>
    );
  }

  useEffect(() => {
    window.history.replaceState(
      null,
      "",
      `/apps/${app?.data.handle}/${activeTemplate}`
    );
  }, [activeTemplate]);

  return (
    <BuilderContent modelName="app" content={app as any}>
      {(_data, _loading, app: AppInfo) => (
        <>
          <Layout title={`${app?.data?.title || ""} | HeadlessApp.Store`}>
            <style>{`
        .monaco-editor .margin, .monaco-editor, .monaco-editor-background, .monaco-editor .inputarea.ime-input {
          background-color: transparent !important;
        }
      `}</style>

            <div className="bg-white shadow-md full-width">
              <div className="container mx-auto py-16">
                <div className="flex flex-col lg:flex-row">
                  <img
                    src={app?.data.image}
                    className="w-96 h-80 rounded-xl bg-white lg:mr-20 self-center object-contain object-center shadow-lg p-6 m-auto lg:m-0"
                  />
                  <div className="my-auto text-center lg:text-left mt-12 lg:mt-0">
                    <h2 className="text-6xl">{app?.data.title}</h2>
                    <p className="text-gray-700 mt-6 text-xl">
                      {app?.data.subtitle}
                    </p>

                    <div className="flex-row mt-10">
                      <a
                        onClick={() => {
                          document
                            .getElementById("get-app-code")
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                        }}
                        className="bg-gradient-to-r from-dark to-primary rounded-full text-white font-semibold py-6 px-10 cursor-pointer uppercase tracking-widest"
                      >
                        Get app
                      </a>
                      <button
                        className="border-primary border-2 rounded-full text-primary font-semibold py-3 px-6 cursor-pointer uppercase tracking-widest ml-6"
                        onClick={() => {
                          setShowBuilderDrawer(true);
                        }}
                      >
                        Customize
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <nav className="flex justify-center flex-col sm:flex-row overflow-auto">
                {app?.data.templates?.map(({ name }, index) => {
                  const isActive = index === activeTemplate;
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        setActiveTemplate(index);
                      }}
                      className={`whitespace-nowrap text-gray-600 py-4 px-6 block hover:text-primary focus:outline-none uppercase tracking-widest font-bold ${
                        isActive
                          ? "text-primary border-b-2 font-medium border-primary"
                          : ""
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </nav>
            </div>

            {app && (
              <GetApp
                initialBuilderJson={initialBuilderJson}
                activeTemplate={activeTemplate}
                onCloseDrawer={() => setShowBuilderDrawer(false)}
                showBuilderDrawer={showBuilderDrawer}
                onShowBuilderDrawer={() => setShowBuilderDrawer(true)}
                app={app}
              />
            )}
            <BuilderComponent model="app" content={app as any} />
          </Layout>
        </>
      )}
    </BuilderContent>
  );
};

export default AppPage;

const flatten = <T extends any>(arr: T[][]) =>
  arr.reduce((memo, item) => {
    return memo.concat(item);
  }, [] as T[]);

export const getStaticPaths: GetStaticPaths = async () => {
  const results = await builder.getAll("app", {
    key: "apps:all",
    fields: "data.handle,data.templates",
  });

  // We'll pre-render only these paths at build time.
  // { fallback: false } means other routes should 404.
  return {
    paths: results
      .map((item) => ({ params: { app: [item.data!.handle] } }))
      .concat(
        flatten(
          results.map(
            (item) =>
              (item as AppInfo).data.templates.map((_template, index) => ({
                params: { app: [item.data!.handle, String(index)] },
              })) || []
          )
        )
      )
      .concat([{ params: { app: ["_"] /* For previewing and editing */ } }]),
    fallback: true,
  };
};

// This function gets called at build time on server-side.
// It won't be called on client-side, so you can even do
// direct database queries.
export const getStaticProps: GetStaticProps = async (context) => {
  const { componentToBuilder, parseJsx } = await import("@jsx-lite/core");
  const path = context.params?.app || "";
  let [handle, initialTemplate] =
    typeof path === "string" ? path.split("/") : path;
  try {
    const data = await builder
      .get("app", {
        query: {
          // Get the specific article by handle
          "data.handle": handle,
        },
        ...{
          options: {
            includeRefs: true,
          } as any,
        },
      })
      .promise();

    let builderJson;
    try {
      const initialTemplateCode =
        data?.data?.templates?.[initialTemplate]?.code;
      builderJson = initialTemplateCode && {
        id: "temp",
        ...componentToBuilder(parseJsx(initialTemplateCode), {
          includeIds: true,
        }),
      };
    } catch (err) {
      console.warn("Could not parse initial template", err);
    }

    return {
      props: JSON.parse(
        JSON.stringify({
          app: data,
          initialBuilderJson: builderJson,
          initialTemplate: Number(initialTemplate) || 0,
        })
      ),
      revalidate: 1,
    };
  } catch (err) {
    return { props: { errors: err.message } };
  }
};
